import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventLogger } from "../src/event-logger.js";

describe("EventLogger", () => {
  it("should record log entries with generated ID and timestamp", () => {
    const logger = new EventLogger();
    const entry = logger.log({
      type: "outbound",
      message: "Test message sent",
      details: { to: "+4799887766" },
    });

    assert.ok(entry.id);
    assert.ok(entry.timestamp);
    assert.equal(entry.type, "outbound");
    assert.equal(entry.message, "Test message sent");
    assert.deepEqual(entry.details, { to: "+4799887766" });

    const events = logger.getEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0].id, entry.id);
  });

  it("should cap stored entries at maxEvents", () => {
    const logger = new EventLogger({ maxEvents: 3 });
    logger.log({ message: "event 1" });
    logger.log({ message: "event 2" });
    logger.log({ message: "event 3" });
    logger.log({ message: "event 4" });

    const events = logger.getEvents();
    assert.equal(events.length, 3);
    assert.equal(events[0].message, "event 4");
  });

  it("should filter by type and support clearing", () => {
    const logger = new EventLogger();
    logger.log({ type: "inbound", message: "Inbound 1" });
    logger.log({ type: "outbound", message: "Outbound 1" });
    logger.log({ type: "inbound", message: "Inbound 2" });

    const inbound = logger.getEvents({ type: "inbound" });
    assert.equal(inbound.length, 2);

    const cleared = logger.clear();
    assert.equal(cleared, 3);
    assert.equal(logger.getEvents().length, 0);
  });
});
