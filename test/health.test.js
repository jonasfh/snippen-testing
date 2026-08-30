import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/app.js";

describe("Health API Endpoints", () => {
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

  it("GET /health should return 200 OK with json status payload", async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);

    const body = await response.json();
    assert.equal(body.status, "ok");
    assert.equal(typeof body.uptime, "number");
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });

  it("POST /health should return 405 Method Not Allowed", async () => {
    const response = await fetch(`${baseUrl}/health`, {
      method: "POST",
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");

    const body = await response.json();
    assert.equal(body.error, "Method Not Allowed");
  });

  it("GET /unknown should return 404 Not Found", async () => {
    const response = await fetch(`${baseUrl}/unknown-endpoint`);
    assert.equal(response.status, 404);

    const body = await response.json();
    assert.equal(body.error, "Not Found");
  });
});
