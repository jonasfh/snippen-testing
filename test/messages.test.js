import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/app.js";
import { MessageStore } from "../src/message-store.js";

describe("Fake SMS Provider Messages API", () => {
  let server;
  let baseUrl;
  let store;
  let mockWebhookCalls = [];

  const mockWebhookDispatcher = async (url, payload) => {
    mockWebhookCalls.push({ url, payload });
    return {
      delivered: true,
      status: 200,
      error: null,
    };
  };

  before(async () => {
    store = new MessageStore();
    const config = {
      port: 0,
      host: "127.0.0.1",
      nodeEnv: "test",
      smsServiceWebhookUrl: "http://127.0.0.1:3999/webhook/sms",
    };

    const app = createApp(config, store, mockWebhookDispatcher);
    server = http.createServer(app);

    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  beforeEach(() => {
    store.clear();
    mockWebhookCalls = [];
  });

  describe("Outgoing SMS", () => {
    it("POST /messages/outbound creates and stores outbound message", async () => {
      const response = await fetch(`${baseUrl}/messages/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "+4799887766",
          text: "Your door code is 1234",
        }),
      });

      assert.equal(response.status, 201);
      const data = await response.json();
      assert.ok(data.id);
      assert.equal(data.direction, "outbound");
      assert.equal(data.to, "+4799887766");
      assert.equal(data.text, "Your door code is 1234");
      assert.equal(data.status, "sent");
      assert.ok(!Number.isNaN(Date.parse(data.createdAt)));

      // Verify it can be retrieved by ID
      const getResponse = await fetch(`${baseUrl}/messages/${data.id}`);
      assert.equal(getResponse.status, 200);
      const fetched = await getResponse.json();
      assert.deepEqual(fetched, data);
    });

    it("POST /sms/send creates outbound message using recipient and message fields", async () => {
      const response = await fetch(`${baseUrl}/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: "+4711223344",
          message: "Payment reminder",
        }),
      });

      assert.equal(response.status, 201);
      const data = await response.json();
      assert.equal(data.direction, "outbound");
      assert.equal(data.to, "+4711223344");
      assert.equal(data.text, "Payment reminder");
    });

    it("POST /messages creates outbound message by default", async () => {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "+4755443322",
          text: "General notification",
        }),
      });

      assert.equal(response.status, 201);
      const data = await response.json();
      assert.equal(data.direction, "outbound");
      assert.equal(data.to, "+4755443322");
    });
  });

  describe("Incoming SMS Simulation", () => {
    it("POST /messages/inbound stores incoming message and dispatches webhook", async () => {
      const response = await fetch(`${baseUrl}/messages/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "+4799112233",
          text: "Can I get 2 extra chairs?",
        }),
      });

      assert.equal(response.status, 201);
      const data = await response.json();
      assert.ok(data.message.id);
      assert.equal(data.message.direction, "inbound");
      assert.equal(data.message.from, "+4799112233");
      assert.equal(data.message.text, "Can I get 2 extra chairs?");
      assert.equal(data.message.status, "received");

      // Verify webhook was called
      assert.equal(mockWebhookCalls.length, 1);
      assert.equal(
        mockWebhookCalls[0].url,
        "http://127.0.0.1:3999/webhook/sms",
      );
      assert.equal(mockWebhookCalls[0].payload.id, data.message.id);
      assert.equal(mockWebhookCalls[0].payload.from, "+4799112233");
      assert.equal(
        mockWebhookCalls[0].payload.text,
        "Can I get 2 extra chairs?",
      );
    });

    it("POST /messages with direction=inbound triggers webhook and stores inbound message", async () => {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "inbound",
          sender: "+4788776655",
          message: "Is cleaning included?",
        }),
      });

      assert.equal(response.status, 201);
      const data = await response.json();
      assert.equal(data.message.direction, "inbound");
      assert.equal(data.message.from, "+4788776655");
      assert.equal(data.message.text, "Is cleaning included?");
      assert.equal(mockWebhookCalls.length, 1);
    });
  });

  describe("Message Inspection and Filtering", () => {
    beforeEach(() => {
      store.createMessage({
        direction: "outbound",
        to: "+4710000001",
        text: "Outbound 1",
      });
      store.createMessage({
        direction: "outbound",
        to: "+4710000002",
        text: "Outbound 2",
      });
      store.createMessage({
        direction: "inbound",
        from: "+4710000001",
        text: "Inbound 1",
      });
    });

    it("GET /messages returns all messages with count", async () => {
      const response = await fetch(`${baseUrl}/messages`);
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.count, 3);
      assert.equal(data.messages.length, 3);
    });

    it("GET /messages?direction=outbound filters outbound messages", async () => {
      const response = await fetch(`${baseUrl}/messages?direction=outbound`);
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.count, 2);
      assert.ok(data.messages.every((m) => m.direction === "outbound"));
    });

    it("GET /messages?direction=inbound filters inbound messages", async () => {
      const response = await fetch(`${baseUrl}/messages?direction=inbound`);
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.count, 1);
      assert.equal(data.messages[0].direction, "inbound");
    });

    it("GET /messages?to=+4710000001 filters by recipient", async () => {
      const response = await fetch(
        `${baseUrl}/messages?to=${encodeURIComponent("+4710000001")}`,
      );
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.count, 1);
      assert.equal(data.messages[0].to, "+4710000001");
    });

    it("GET /messages?from=+4710000001 filters by sender", async () => {
      const response = await fetch(
        `${baseUrl}/messages?from=${encodeURIComponent("+4710000001")}`,
      );
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.count, 1);
      assert.equal(data.messages[0].from, "+4710000001");
    });

    it("GET /messages/:id returns 404 for unknown message ID", async () => {
      const response = await fetch(`${baseUrl}/messages/non-existent-id`);
      assert.equal(response.status, 404);

      const data = await response.json();
      assert.equal(data.error, "Message not found");
    });
  });

  describe("State Reset", () => {
    it("DELETE /messages clears all stored messages", async () => {
      store.createMessage({
        direction: "outbound",
        to: "+4799000000",
        text: "Test 1",
      });
      store.createMessage({
        direction: "inbound",
        from: "+4799000000",
        text: "Test 2",
      });

      assert.equal(store.count(), 2);

      const response = await fetch(`${baseUrl}/messages`, {
        method: "DELETE",
      });
      assert.equal(response.status, 200);

      const data = await response.json();
      assert.equal(data.message, "All messages cleared");
      assert.equal(data.count, 2);

      const inspectResponse = await fetch(`${baseUrl}/messages`);
      const inspectData = await inspectResponse.json();
      assert.equal(inspectData.count, 0);
      assert.equal(inspectData.messages.length, 0);
    });
  });

  describe("Validation & Error Handling", () => {
    it("POST /messages/outbound with missing recipient returns 400", async () => {
      const response = await fetch(`${baseUrl}/messages/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Missing to" }),
      });

      assert.equal(response.status, 400);
      const data = await response.json();
      assert.match(data.error, /Recipient phone number/);
    });

    it("POST /messages/outbound with missing text returns 400", async () => {
      const response = await fetch(`${baseUrl}/messages/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "+4799887766" }),
      });

      assert.equal(response.status, 400);
      const data = await response.json();
      assert.match(data.error, /Message text/);
    });

    it("POST /messages/inbound with missing sender returns 400", async () => {
      const response = await fetch(`${baseUrl}/messages/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Missing from" }),
      });

      assert.equal(response.status, 400);
      const data = await response.json();
      assert.match(data.error, /Sender phone number/);
    });

    it("POST /messages/inbound with missing text returns 400", async () => {
      const response = await fetch(`${baseUrl}/messages/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "+4799887766" }),
      });

      assert.equal(response.status, 400);
      const data = await response.json();
      assert.match(data.error, /Message text/);
    });

    it("Malformed JSON body returns 400", async () => {
      const response = await fetch(`${baseUrl}/messages/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad-json",
      });

      assert.equal(response.status, 400);
      const data = await response.json();
      assert.match(data.error, /Invalid JSON/);
    });

    it("PUT /messages returns 405 Method Not Allowed", async () => {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "PUT",
      });

      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), "GET, POST, DELETE");
      const data = await response.json();
      assert.equal(data.error, "Method Not Allowed");
    });
  });
});
