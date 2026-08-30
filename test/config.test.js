import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("should return default configuration when no environment variables are provided", () => {
    const config = loadConfig({});
    assert.deepEqual(config, {
      port: 3000,
      host: "0.0.0.0",
      nodeEnv: "development",
    });
  });

  it("should parse valid custom environment variables", () => {
    const config = loadConfig({
      PORT: "8080",
      HOST: "127.0.0.1",
      NODE_ENV: "production",
    });
    assert.deepEqual(config, {
      port: 8080,
      host: "127.0.0.1",
      nodeEnv: "production",
    });
  });

  it("should throw error for non-numeric port", () => {
    assert.throws(
      () => loadConfig({ PORT: "invalid" }),
      /Invalid PORT configuration/,
    );
  });

  it("should throw error for out-of-range port", () => {
    assert.throws(
      () => loadConfig({ PORT: "70000" }),
      /Invalid PORT configuration/,
    );
    assert.throws(
      () => loadConfig({ PORT: "0" }),
      /Invalid PORT configuration/,
    );
    assert.throws(
      () => loadConfig({ PORT: "-1" }),
      /Invalid PORT configuration/,
    );
  });
});
