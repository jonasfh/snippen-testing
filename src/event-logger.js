import { randomUUID } from "node:crypto";

export class EventLogger {
  constructor({ maxEvents = 200 } = {}) {
    this.maxEvents = maxEvents;
    this.events = [];
  }

  log({ type = "info", message, details = null, level = "info" }) {
    const entry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      level,
      message,
      details,
    };

    this.events.unshift(entry);
    if (this.events.length > this.maxEvents) {
      this.events.length = this.maxEvents;
    }

    return entry;
  }

  getEvents({ limit = 50, type = null } = {}) {
    let result = this.events;
    if (type) {
      result = result.filter((e) => e.type === type);
    }
    return result.slice(0, limit);
  }

  clear() {
    const count = this.events.length;
    this.events = [];
    return count;
  }
}
