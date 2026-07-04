import { createFileRoute } from "@tanstack/react-router";

import { getDatabaseConfig, pingDatabase } from "@/lib/db/client";

export const Route = createFileRoute("/api/health/db")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await pingDatabase();
          const config = getDatabaseConfig();
          return Response.json({
            ok: true,
            database: config.database,
            host: config.host,
            port: config.port,
          });
        } catch (error) {
          console.error("[api/health/db]", error);
          return Response.json(
            {
              ok: false,
              message:
                "MariaDB connection failed. Start MariaDB, run database/install_all.sql in HeidiSQL, and set .env.",
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 503 }
          );
        }
      },
    },
  },
});
