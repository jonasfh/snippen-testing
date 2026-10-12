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

let BOOKING_BASE_URL = process.env.BOOKING_BASE_URL;
let DOORMAN_API_URL = process.env.DOORMAN_API_URL;
let FAKE_PROVIDER_URL = process.env.FAKE_PROVIDER_URL;
const DOORMAN_API_TOKEN =
  process.env.SNIPPEN_DOORMAN_API_TOKEN || "test-integration-token";

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

async function ensureDoormanApiEnabled() {
  try {
    await execAsync(
      `docker exec snippen-booking wp --path=/wordpress option set snippen_enable_doorman_api yes --allow-root`,
    );
    await execAsync(
      `docker exec snippen-booking wp --path=/wordpress option set snippen_doorman_api_token "${DOORMAN_API_TOKEN}" --allow-root`,
    );
  } catch {
    // If docker exec is not available directly, rely on container init configuration
  }
}

describe("Snippen Doorman Service E2E Integration Test Suite", () => {
  before(async () => {
    if (!BOOKING_BASE_URL) {
      BOOKING_BASE_URL = await resolveServiceUrl(
        [
          "http://snippen-booking:8080",
          "http://127.0.0.1:8080",
          "http://localhost:8080",
        ],
        "/wp-json/snippen/v1/door/bookings",
      );
    }
    DOORMAN_API_URL = `${BOOKING_BASE_URL}/wp-json/snippen/v1/door`;

    if (!FAKE_PROVIDER_URL) {
      FAKE_PROVIDER_URL = await resolveServiceUrl([
        "http://fake-sms-provider:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
      ]);
    }

    await ensureDoormanApiEnabled();

    // Verify endpoint responds with expected auth guard or success
    const probeRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    assert.ok(
      probeRes.status === 200,
      `Doorman API at ${DOORMAN_API_URL}/bookings must return 200 (received HTTP ${probeRes.status})`,
    );
  });

  it("1. REST API Contract & Authorization (GET /door/bookings)", async () => {
    // 1a. Unauthorized request without header returns 401
    const unauthRes = await fetch(`${DOORMAN_API_URL}/bookings`);
    assert.equal(
      unauthRes.status,
      401,
      "Request without authorization header must be rejected with 401",
    );

    // 1b. Request with invalid token returns 401
    const badTokenRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: "Bearer wrong-token-123" },
    });
    assert.equal(
      badTokenRes.status,
      401,
      "Request with invalid token must be rejected with 401",
    );

    // 1c. Authorized request with Bearer token succeeds
    const bearerRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    assert.equal(bearerRes.status, 200);
    const bearerData = await bearerRes.json();
    assert.ok(
      Array.isArray(bearerData.bookings),
      "Response must contain 'bookings' array",
    );

    // 1d. Authorized request with X-API-Key header succeeds
    const apiKeyRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { "X-API-Key": DOORMAN_API_TOKEN },
    });
    assert.equal(apiKeyRes.status, 200);

    // 1e. Zero-PII GDPR compliance check on payload structure
    for (const b of bearerData.bookings) {
      assert.ok(b.id, "Booking must have an id");
      assert.ok(b.start_time, "Booking must have a start_time");
      assert.ok(b.end_time, "Booking must have an end_time");
      assert.equal(
        b.customer_name,
        undefined,
        "GDPR: customer_name must not be exposed",
      );
      assert.equal(
        b.customer_phone,
        undefined,
        "GDPR: customer_phone must not be exposed",
      );
      assert.equal(
        b.customer_email,
        undefined,
        "GDPR: customer_email must not be exposed",
      );
    }
  });

  it("2. Auto-PIN Generation & Two-Way Sync (Booking <-> Doorman Poller)", async () => {
    // 2a. Fetch active bookings
    const res = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    const data = await res.json();
    assert.ok(data.bookings.length > 0, "Expected at least one active booking");
    const targetBooking = data.bookings[0];
    const bookingId = targetBooking.id;

    // 2b. Clear door_code via PATCH to simulate a fresh booking needing PIN generation
    const clearRes = await fetch(
      `${DOORMAN_API_URL}/bookings/${bookingId}/code`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${DOORMAN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ door_code: "" }),
      },
    );
    assert.equal(clearRes.status, 200, "Clearing door code must return 200");

    // Verify code is currently cleared
    const clearedCheck = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    const clearedData = await clearedCheck.json();
    const clearedItem = clearedData.bookings.find(
      (b) => String(b.id) === String(bookingId),
    );
    assert.ok(!clearedItem?.door_code, "Door code should be empty after clear");

    // 2c. Wait for snippen-doorman-service to poll, generate 6-digit PIN, and patch it back
    const provisionedBooking = await waitForCondition(
      async () => {
        const checkRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
          headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
        });
        if (!checkRes.ok) return null;
        const checkData = await checkRes.json();
        const b = (checkData.bookings || []).find(
          (item) => String(item.id) === String(bookingId),
        );
        if (b && b.door_code && /^\d{4,6}$/.test(b.door_code)) {
          return b;
        }
        return null;
      },
      { timeoutMs: 20000, intervalMs: 1000 },
    );

    assert.ok(
      provisionedBooking,
      "snippen-doorman-service should have generated and assigned a numeric PIN",
    );
    assert.match(
      provisionedBooking.door_code,
      /^\d{4,6}$/,
      "Assigned PIN must be a 4-6 digit numeric code",
    );

    // 2d. State Persistence verification: querying again returns identical code
    const secondCheck = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    const secondData = await secondCheck.json();
    const persisted = secondData.bookings.find(
      (b) => String(b.id) === String(bookingId),
    );
    assert.equal(
      persisted.door_code,
      provisionedBooking.door_code,
      "Assigned door code must be persisted across calls",
    );
  });

  it("3. Manual PIN Update & Poller Idempotency", async () => {
    // 3a. Retrieve current booking
    const listRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    const listData = await listRes.json();
    const target = listData.bookings[0];
    const bookingId = target.id;
    const manualPin = "654321";

    // 3b. Manually patch a specific PIN
    const patchRes = await fetch(
      `${DOORMAN_API_URL}/bookings/${bookingId}/code`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${DOORMAN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ door_code: manualPin }),
      },
    );
    assert.equal(patchRes.status, 200);

    // 3c. Wait 2 seconds (spanning at least one polling tick) and verify poller did not overwrite it
    await new Promise((r) => setTimeout(r, 2000));

    const verifyRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    const verifyData = await verifyRes.json();
    const updated = verifyData.bookings.find(
      (b) => String(b.id) === String(bookingId),
    );
    assert.equal(
      updated.door_code,
      manualPin,
      "Poller must respect explicitly set PIN and not overwrite it",
    );
  });

  it("4. End-to-End Notification Verification: Door Code delivered via SMS", async () => {
    // 4a. Get the active booking and door code
    const listRes = await fetch(`${DOORMAN_API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${DOORMAN_API_TOKEN}` },
    });
    const listData = await listRes.json();
    const target = listData.bookings[0];
    assert.ok(
      target.door_code,
      "Target booking must have an assigned door code",
    );
    const activeDoorCode = target.door_code;
    const targetPhone = "+4799887766";

    // 4b. Queue outbound SMS message with the door code in Snippen Booking
    try {
      await execAsync(
        `docker exec snippen-booking wp --path=/wordpress eval '\\SnippenBooking\\Service\\Notification\\MessageLoggerService::log_message(${target.id}, 1, "sms", "${targetPhone}", null, "Din adgangskode til Snippen er ${activeDoorCode}", "booking_confirmation", "queued", array("provider" => "snippen_sms_service", "sender" => "Snippen"));' --allow-root`,
      );
    } catch {
      // If docker exec unavailable, continue and verify provider inspection
    }

    // 4c. Verify Fake SMS Provider receives the message containing the door code
    const receivedMsg = await waitForCondition(
      async () => {
        const res = await fetch(
          `${FAKE_PROVIDER_URL}/messages?direction=outbound`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        return (
          (data.messages || []).find(
            (m) =>
              m.to?.includes("99887766") && m.text?.includes(activeDoorCode),
          ) || null
        );
      },
      { timeoutMs: 15000 },
    );

    assert.ok(
      receivedMsg,
      `Outbound SMS with door code ${activeDoorCode} must be delivered to Fake SMS Provider`,
    );
    assert.ok(
      receivedMsg.text.includes(activeDoorCode),
      `SMS text must contain assigned door code ${activeDoorCode}`,
    );
  });
});
