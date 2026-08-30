function parsePort(portStr, defaultPort = 3000) {
  if (!portStr) {
    return defaultPort;
  }
  const parsed = Number.parseInt(portStr, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid PORT configuration: "${portStr}". Must be an integer between 1 and 65535.`,
    );
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  const port = parsePort(env.PORT, 3000);
  const host = env.HOST ?? "0.0.0.0";
  const nodeEnv = env.NODE_ENV ?? "development";

  return {
    port,
    host,
    nodeEnv,
  };
}
