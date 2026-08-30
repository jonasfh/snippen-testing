import http from "node:http";
import process from "node:process";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

export function createServer(app = createApp()) {
  return http.createServer(app);
}

export function startServer(config = loadConfig()) {
  const app = createApp();
  const server = createServer(app);

  return new Promise((resolve, reject) => {
    server.on("error", (err) => {
      console.error(
        JSON.stringify({
          level: "error",
          message: "Server encountered an error",
          error: err.message,
        }),
      );
      reject(err);
    });

    server.listen(config.port, config.host, () => {
      const address = server.address();
      const actualPort =
        typeof address === "object" && address !== null
          ? address.port
          : config.port;

      console.info(
        JSON.stringify({
          level: "info",
          message: "Server started",
          host: config.host,
          port: actualPort,
          env: config.nodeEnv,
        }),
      );
      resolve(server);
    });

    const shutdown = (signal) => {
      console.info(
        JSON.stringify({
          level: "info",
          message: `Received ${signal}, shutting down gracefully`,
        }),
      );

      server.close((err) => {
        if (err) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "Error during server close",
              error: err.message,
            }),
          );
          process.exit(1);
        }
        console.info(
          JSON.stringify({
            level: "info",
            message: "Server closed successfully",
          }),
        );
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  });
}

// Start automatically if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    startServer();
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Failed to initialize server",
        error: err.message,
      }),
    );
    process.exit(1);
  }
}
