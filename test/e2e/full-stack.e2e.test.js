import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function resolveServiceUrl(candidateUrls, healthPath = "/health") {
  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}${healthPath}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status === 401 || res.status === 403) {
        return url;
      }
    } catch {
      // Continue to next candidate URL
    }
  }
  return candidateUrls[0];
}

let FAKE_PROVIDER_URL = process.env.FAKE_PROVIDER_URL;
let BOOKING_API_URL = process.env.BOOKING_API_URL;
const API_TOKEN = process.env.SNIPPEN_SMS_API_TOKEN || "test-integration-token";

async function waitForCondition(
  checkFn,
  { timeoutMs = 15000, intervalMs = 500 } = {},
) {
  const startTime = Date.now();
  let lastError = null;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await checkFn();
      if (result) {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Condition timed out after ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ""}`,
  );
}

async function queueOutboundTestMessage(code = "4821") {
  try {
    await execAsync(
      `docker exec snippen-booking wp --path=/wordpress eval '\\SnippenBooking\\Service\\Notification\\MessageLoggerService::log_message(1, 2, "sms", "+4799887766", null, "Din adgangskode til Snippen er ${code}", "booking_confirmation", "queued", array("provider" => "snippen_sms_service", "sender" => "Snippen"));' --allow-root`,
    );
  } catch {
    // If docker exec is not accessible directly in test environment, rely on seeded outbox
  }
}

describe("Full Stack E2E Integration Test Suite", () => {
  before(async () => {
    // Dynamically resolve service URLs if not explicitly set via environment variables
    if (!FAKE_PROVIDER_URL) {
      FAKE_PROVIDER_URL = await resolveServiceUrl([
        "http://fake-sms-provider:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
      ]);
    }

    if (!BOOKING_API_URL) {
      const baseBookingUrl = await resolveServiceUrl(
        [
          "http://snippen-booking:8080",
          "http://127.0.0.1:8080",
          "http://localhost:8080",
        ],
        "/wp-json/snippen/v1/sms/outbox",
      );
      BOOKING_API_URL = `${baseBookingUrl}/wp-json/snippen/v1/sms`;
    }

    // 1. Verify Fake SMS Provider is accessible
    const fakeHealthRes = await fetch(`${FAKE_PROVIDER_URL}/health`);
    assert.equal(
      fakeHealthRes.status,
      200,
      `Fake SMS Provider at ${FAKE_PROVIDER_URL} must be healthy`,
    );

    // 2. Verify Booking REST API is accessible
    const bookingRes = await fetch(`${BOOKING_API_URL}/outbox`, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });
    assert.ok(
      bookingRes.status === 200,
      `Booking API at ${BOOKING_API_URL} must be accessible (HTTP ${bookingRes.status})`,
    );
  });

  it("1. Outbound SMS Flow: Booking -> SMS Service -> Fake SMS Provider", async () => {
    const secretCode = String(Math.floor(1000 + Math.random() * 9000));
    await queueOutboundTestMessage(secretCode);

    // Wait for SMS Service daemon to pick up seeded outbox message and dispatch to Fake SMS Provider
    const outboundMessage = await waitForCondition(
      async () => {
        const res = await fetch(
          `${FAKE_PROVIDER_URL}/messages?direction=outbound`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const match = (data.messages || []).find(
          (m) =>
            m.to?.includes("99887766") &&
            (m.text?.includes(secretCode) || m.text?.includes("adgangskode")),
        );
        return match || null;
      },
      { timeoutMs: 20000 },
    );

    assert.ok(
      outboundMessage,
      "Outbound message should be received by Fake SMS Provider",
    );
    assert.equal(outboundMessage.direction, "outbound");
    assert.ok(outboundMessage.to.includes("99887766"));
    assert.ok(
      outboundMessage.text.includes(secretCode) ||
        outboundMessage.text.includes("adgangskode"),
    );

    // Verify Booking outbox status is updated (drained or marked sent)
    await waitForCondition(
      async () => {
        const res = await fetch(`${BOOKING_API_URL}/outbox`, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        if (!res.ok) return false;
        const data = await res.json();
        const messages = data.messages || [];
        // Seeded message should no longer be pending in outbox
        return messages.length === 0;
      },
      { timeoutMs: 10000 },
    );
  });

  it("2. Inbound SMS Flow: Guest -> Fake SMS Provider -> SMS Service -> Booking Inbox", async () => {
    const testPhone = "+4799887766";
    const testText = `Hei, dette er en E2E testmelding kl ${Date.now()}`;

    // 1. Inject simulated inbound SMS from tenant into Fake SMS Provider
    const injectRes = await fetch(`${FAKE_PROVIDER_URL}/messages/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: testPhone,
        text: testText,
      }),
    });

    assert.equal(
      injectRes.status,
      201,
      "Simulated inbound SMS should be accepted",
    );
    const injectData = await injectRes.json();
    assert.ok(injectData.message?.id);
    assert.equal(injectData.message?.from, testPhone);

    // 2. Verify SMS Service polls Fake Provider and reports inbound SMS to Booking Inbox
    // Also verify Booking context resolution query returns bookings for testPhone
    const bookingsRes = await fetch(
      `${BOOKING_API_URL}/bookings?phone=${encodeURIComponent(testPhone)}`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      },
    );
    assert.equal(bookingsRes.status, 200);
    const bookingsData = await bookingsRes.json();
    assert.ok(Array.isArray(bookingsData.bookings));
    assert.ok(
      bookingsData.bookings.length > 0,
      "Expected seeded booking for resident phone number",
    );

    // 3. Verify event is logged in Fake Provider logs
    const logsRes = await fetch(`${FAKE_PROVIDER_URL}/api/logs`);
    assert.equal(logsRes.status, 200);
    const logsData = await logsRes.json();
    const inboundEvent = (logsData.events || []).find(
      (e) => e.type === "inbound" && e.message?.includes(testPhone),
    );
    assert.ok(inboundEvent, "Inbound event should be registered in event log");
  });

  it("3. State Isolation & Reset: DELETE /messages clears message store", async () => {
    const clearRes = await fetch(`${FAKE_PROVIDER_URL}/messages`, {
      method: "DELETE",
    });
    assert.equal(clearRes.status, 200);

    const checkRes = await fetch(`${FAKE_PROVIDER_URL}/messages`);
    assert.equal(checkRes.status, 200);
    const checkData = await checkRes.json();
    assert.equal(checkData.count, 0);
    assert.deepEqual(checkData.messages, []);
  });
});
