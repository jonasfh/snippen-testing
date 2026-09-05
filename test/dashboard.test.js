import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/app.js";

describe("Dashboard and Event Logs API Endpoints", () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
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

  it("GET / should return 200 OK with HTML content", async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);

    const body = await response.text();
    assert.ok(body.includes("Snippen Fake SMS Provider"));
    assert.ok(body.includes("SMS-simulator"));
  });

  it("POST / should return 405 Method Not Allowed", async () => {
    const response = await fetch(`${baseUrl}/`, {
      method: "POST",
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
  });

  it("GET /logs and /api/logs should return JSON list of events", async () => {
    const response = await fetch(`${baseUrl}/api/logs`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);

    const body = await response.json();
    assert.ok(Array.isArray(body.events));
    assert.equal(typeof body.count, "number");
  });

  it("DELETE /logs should clear the event log", async () => {
    const response = await fetch(`${baseUrl}/logs`, {
      method: "DELETE",
    });
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.message, "All logs cleared");

    const checkRes = await fetch(`${baseUrl}/logs`);
    const checkBody = await checkRes.json();
    assert.equal(checkBody.events.length, 0);
  });
});
