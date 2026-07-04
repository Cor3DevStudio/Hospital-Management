import { createFileRoute } from "@tanstack/react-router";

import { loginWithDatabase } from "@/lib/auth/serverAuth";
import type { LoginRequest } from "@/lib/auth/types";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as LoginRequest;

          if (!body?.username?.trim() || !body?.password) {
            return Response.json(
              { success: false, message: "Username and password are required" },
              { status: 400 }
            );
          }

          const result = await loginWithDatabase({
            username: body.username,
            password: body.password,
          });

          return Response.json(result, { status: result.success ? 200 : 401 });
        } catch (error) {
          console.error("[api/auth/login]", error);
          return Response.json(
            {
              success: false,
              message:
                "Unable to connect to the database. Check MariaDB is running and .env is configured.",
            },
            { status: 503 }
          );
        }
      },
    },
  },
});
