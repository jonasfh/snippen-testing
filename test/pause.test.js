import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/app.js";
import { MessageStore } from "../src/message-store.js";
import { EventLogger } from "../src/event-logger.js";

describe("Pause and Resume API Endpoints", () => {
  let server;
  let baseUrl;
  let store;
  let logger;

  beforeEach(async () => {
    store = new MessageStore();
    logger = new EventLogger();
    const webhookDispatcher = async () => ({
      delivered: true,
      status: 200,
      error: null,
    });
    const app = createApp(
      { smsServiceWebhookUrl: "http://127.0.0.1:3001/webhook/sms" },
      store,
      webhookDispatcher,
      logger,
    );
    server = http.createServer(app);

    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it("GET /api/status returns active state by default", async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.paused, false);
    assert.equal(body.status, "active");
  });

  it("POST /api/pause pauses provider and returns 503 for all outbound SMS endpoints", async () => {
    const pauseRes = await fetch(`${baseUrl}/api/pause`, { method: "POST" });
    assert.equal(pauseRes.status, 200);
    const pauseBody = await pauseRes.json();
    assert.equal(pauseBody.paused, true);
    assert.equal(pauseBody.status, "paused");

    const statusRes = await fetch(`${baseUrl}/api/status`);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.paused, true);
    assert.equal(statusBody.status, "paused");

    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.paused, true);

    const outboundEndpoints = [
      "/messages/outbound",
      "/api/sms/send",
      "/sms/send",
      "/messages",
    ];

    for (const endpoint of outboundEndpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "+4712345678", text: "Test while paused" }),
      });
      assert.equal(res.status, 503, `Expected 503 for ${endpoint}`);
      const body = await res.json();
      assert.equal(body.paused, true);
      assert.match(body.error, /paused/i);
    }

    assert.equal(store.getMessages().length, 0);

    const logs = logger.getEvents({ type: "paused" });
    assert.ok(logs.length >= 5);
  });

  it("keeps simulated inbound SMS, dashboard, and logs available while paused", async () => {
    await fetch(`${baseUrl}/api/pause`, { method: "POST" });

    const dashRes = await fetch(`${baseUrl}/`);
    assert.equal(dashRes.status, 200);

    const logsRes = await fetch(`${baseUrl}/api/logs`);
    assert.equal(logsRes.status, 200);

    const inboundRes = await fetch(`${baseUrl}/messages/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "+4799887766", text: "Hei!" }),
    });
    assert.equal(inboundRes.status, 201);
  });

  it("POST /api/resume re-enables outbound SMS endpoints", async () => {
    await fetch(`${baseUrl}/api/pause`, { method: "POST" });

    const blockedRes = await fetch(`${baseUrl}/messages/outbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "+4712345678", text: "Blocked" }),
    });
    assert.equal(blockedRes.status, 503);

    const resumeRes = await fetch(`${baseUrl}/api/resume`, { method: "POST" });
    assert.equal(resumeRes.status, 200);
    const resumeBody = await resumeRes.json();
    assert.equal(resumeBody.paused, false);
    assert.equal(resumeBody.status, "active");

    const okRes = await fetch(`${baseUrl}/messages/outbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "+4712345678", text: "Allowed again" }),
    });
    assert.equal(okRes.status, 201);
    assert.equal(store.getMessages().length, 1);
  });

  it("POST /api/status supports setting paused boolean and validates input", async () => {
    const badRes = await fetch(`${baseUrl}/api/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: "yes" }),
    });
    assert.equal(badRes.status, 400);

    const pauseRes = await fetch(`${baseUrl}/api/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: true }),
    });
    assert.equal(pauseRes.status, 200);
    assert.equal((await pauseRes.json()).paused, true);

    const resumeRes = await fetch(`${baseUrl}/api/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: false }),
    });
    assert.equal(resumeRes.status, 200);
    assert.equal((await resumeRes.json()).paused, false);
  });

  it("rejects unsupported HTTP methods on status, pause, and resume", async () => {
    const statusPut = await fetch(`${baseUrl}/api/status`, { method: "PUT" });
    assert.equal(statusPut.status, 405);
    assert.equal(statusPut.headers.get("allow"), "GET, POST");

    const pauseGet = await fetch(`${baseUrl}/api/pause`, { method: "GET" });
    assert.equal(pauseGet.status, 405);
    assert.equal(pauseGet.headers.get("allow"), "POST");

    const resumeGet = await fetch(`${baseUrl}/api/resume`, { method: "GET" });
    assert.equal(resumeGet.status, 405);
    assert.equal(resumeGet.headers.get("allow"), "POST");
  });
});
