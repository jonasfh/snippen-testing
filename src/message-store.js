import { randomUUID } from "node:crypto";

export class MessageStore {
  #messages = new Map();

  createMessage({
    direction,
    to = null,
    from = null,
    text,
    status = "sent",
    metadata = {},
  }) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const message = {
      id,
      direction,
      to,
      from,
      text,
      status,
      createdAt,
      metadata: { ...metadata },
    };

    this.#messages.set(id, message);
    return { ...message };
  }

  getMessages(filters = {}) {
    let result = Array.from(this.#messages.values());

    if (filters.direction) {
      result = result.filter((msg) => msg.direction === filters.direction);
    }
    if (filters.to) {
      result = result.filter((msg) => msg.to === filters.to);
    }
    if (filters.from) {
      result = result.filter((msg) => msg.from === filters.from);
    }

    return result.map((msg) => ({ ...msg }));
  }

  getMessageById(id) {
    const message = this.#messages.get(id);
    return message ? { ...message } : null;
  }

  clear() {
    const count = this.#messages.size;
    this.#messages.clear();
    return count;
  }

  count() {
    return this.#messages.size;
  }
}
