function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function createApp() {
  return function requestListener(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const pathname = url.pathname;

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
