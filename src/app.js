import { MessageStore } from "./message-store.js";
import { loadConfig } from "./config.js";

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJsonBody(req, { maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytesRead = 0;

    req.on("data", (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        const error = new Error("Payload Too Large");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const error = new Error("Invalid JSON in request body");
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

async function dispatchWebhook(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return {
      delivered: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP status ${response.status}`,
    };
  } catch (err) {
    return {
      delivered: false,
      status: null,
      error: err.message,
    };
  }
}

export function createApp(
  config = loadConfig(),
  store = new MessageStore(),
  webhookDispatcher = dispatchWebhook,
) {
  return async function requestListener(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const pathname = url.pathname;

      // 1. Health check
      if (pathname === "/health") {
        if (req.method === "GET") {
          sendJson(res, 200, {
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.setHeader("Allow", "GET");
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      // 2. Outgoing SMS (send operation)
      if (
        pathname === "/messages/outbound" ||
        pathname === "/api/sms/send" ||
        pathname === "/sms/send"
      ) {
        if (req.method === "POST") {
          let body;
          try {
            body = await readJsonBody(req);
          } catch (err) {
            sendJson(res, err.statusCode ?? 400, { error: err.message });
            return;
          }

          const recipient = body.to ?? body.recipient;
          const text = body.text ?? body.message;
          const sender = body.from ?? body.sender ?? "Snippen";

          if (
            !recipient ||
            typeof recipient !== "string" ||
            !recipient.trim()
          ) {
            sendJson(res, 400, {
              error: "Recipient phone number ('to' or 'recipient') is required",
            });
            return;
          }

          if (!text || typeof text !== "string" || !text.trim()) {
            sendJson(res, 400, {
              error: "Message text ('text' or 'message') is required",
            });
            return;
          }

          const message = store.createMessage({
            direction: "outbound",
            to: recipient.trim(),
            from: typeof sender === "string" ? sender.trim() : null,
            text: text.trim(),
            status: "sent",
            metadata: body.metadata ?? {},
          });

          sendJson(res, 201, message);
          return;
        }

        res.setHeader("Allow", "POST");
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      // 3. Simulated Incoming SMS
      if (
        pathname === "/messages/inbound" ||
        pathname === "/simulate/inbound" ||
        pathname === "/messages/simulate-inbound"
      ) {
        if (req.method === "POST") {
          let body;
          try {
            body = await readJsonBody(req);
          } catch (err) {
            sendJson(res, err.statusCode ?? 400, { error: err.message });
            return;
          }

          const sender = body.from ?? body.sender;
          const text = body.text ?? body.message;
          const recipient = body.to ?? body.recipient ?? null;

          if (!sender || typeof sender !== "string" || !sender.trim()) {
            sendJson(res, 400, {
              error: "Sender phone number ('from' or 'sender') is required",
            });
            return;
          }

          if (!text || typeof text !== "string" || !text.trim()) {
            sendJson(res, 400, {
              error: "Message text ('text' or 'message') is required",
            });
            return;
          }

          const message = store.createMessage({
            direction: "inbound",
            from: sender.trim(),
            to: typeof recipient === "string" ? recipient.trim() : null,
            text: text.trim(),
            status: "received",
            metadata: body.metadata ?? {},
          });

          const webhookResult = await webhookDispatcher(
            config.smsServiceWebhookUrl,
            {
              id: message.id,
              from: message.from,
              to: message.to,
              text: message.text,
              timestamp: message.createdAt,
              metadata: message.metadata,
            },
          );

          sendJson(res, 201, {
            message,
            webhook: {
              url: config.smsServiceWebhookUrl,
              ...webhookResult,
            },
          });
          return;
        }

        res.setHeader("Allow", "POST");
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      // 4. Message collection endpoints: GET /messages, DELETE /messages, POST /messages
      if (pathname === "/messages" || pathname === "/api/messages") {
        if (req.method === "GET") {
          const direction = url.searchParams.get("direction") ?? undefined;
          const to =
            url.searchParams.get("to") ??
            url.searchParams.get("recipient") ??
            undefined;
          const from =
            url.searchParams.get("from") ??
            url.searchParams.get("sender") ??
            undefined;

          const messages = store.getMessages({ direction, to, from });
          sendJson(res, 200, {
            messages,
            count: messages.length,
          });
          return;
        }

        if (req.method === "DELETE") {
          const clearedCount = store.clear();
          sendJson(res, 200, {
            message: "All messages cleared",
            count: clearedCount,
          });
          return;
        }

        if (req.method === "POST") {
          let body;
          try {
            body = await readJsonBody(req);
          } catch (err) {
            sendJson(res, err.statusCode ?? 400, { error: err.message });
            return;
          }

          const direction = body.direction ?? "outbound";
          const recipient = body.to ?? body.recipient;
          const sender = body.from ?? body.sender;
          const text = body.text ?? body.message;

          if (direction === "inbound") {
            if (!sender || typeof sender !== "string" || !sender.trim()) {
              sendJson(res, 400, {
                error: "Sender phone number ('from' or 'sender') is required",
              });
              return;
            }
            if (!text || typeof text !== "string" || !text.trim()) {
              sendJson(res, 400, {
                error: "Message text ('text' or 'message') is required",
              });
              return;
            }

            const message = store.createMessage({
              direction: "inbound",
              from: sender.trim(),
              to: typeof recipient === "string" ? recipient.trim() : null,
              text: text.trim(),
              status: "received",
              metadata: body.metadata ?? {},
            });

            const webhookResult = await webhookDispatcher(
              config.smsServiceWebhookUrl,
              {
                id: message.id,
                from: message.from,
                to: message.to,
                text: message.text,
                timestamp: message.createdAt,
                metadata: message.metadata,
              },
            );

            sendJson(res, 201, {
              message,
              webhook: {
                url: config.smsServiceWebhookUrl,
                ...webhookResult,
              },
            });
            return;
          }

          if (
            !recipient ||
            typeof recipient !== "string" ||
            !recipient.trim()
          ) {
            sendJson(res, 400, {
              error: "Recipient phone number ('to' or 'recipient') is required",
            });
            return;
          }
          if (!text || typeof text !== "string" || !text.trim()) {
            sendJson(res, 400, {
              error: "Message text ('text' or 'message') is required",
            });
            return;
          }

          const message = store.createMessage({
            direction: "outbound",
            to: recipient.trim(),
            from:
              typeof sender === "string" && sender.trim()
                ? sender.trim()
                : "Snippen",
            text: text.trim(),
            status: "sent",
            metadata: body.metadata ?? {},
          });

          sendJson(res, 201, message);
          return;
        }

        res.setHeader("Allow", "GET, POST, DELETE");
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      // 5. Single message lookup: GET /messages/:id or /api/messages/:id
      const messageIdMatch = pathname.match(
        /^\/(?:api\/)?messages\/([a-zA-Z0-9_-]+)$/,
      );
      if (messageIdMatch) {
        if (req.method === "GET") {
          const messageId = messageIdMatch[1];
          const message = store.getMessageById(messageId);

          if (!message) {
            sendJson(res, 404, { error: "Message not found" });
            return;
          }

          sendJson(res, 200, message);
          return;
        }

        res.setHeader("Allow", "GET");
        sendJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      // 6. Unknown route
      sendJson(res, 404, { error: "Not Found" });
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "Unhandled request error",
          error: err.message,
          stack: err.stack,
        }),
      );
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Internal Server Error" });
      }
    }
  };
}
