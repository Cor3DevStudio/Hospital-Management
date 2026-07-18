import { createFileRoute } from "@tanstack/react-router";

import { registerWithDatabase } from "@/lib/auth/serverAuth";
import type { UserRole } from "@/lib/auth/types";

type RegisterBody = {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as RegisterBody;

          if (!body?.username?.trim() || !body?.password || !body?.fullName?.trim()) {
            return Response.json(
              { success: false, message: "All fields are required" },
              { status: 400 },
            );
          }

          if (body.password.length < 6) {
            return Response.json(
              { success: false, message: "Password must be at least 6 characters" },
              { status: 400 },
            );
          }

          const result = await registerWithDatabase({
            username: body.username,
            password: body.password,
            fullName: body.fullName,
            role: body.role ?? "Doctor",
          });

          return Response.json(result, { status: result.success ? 201 : 409 });
        } catch (error) {
          console.error("[api/auth/register]", error);
          return Response.json(
            {
              success: false,
              message:
                "Unable to connect to the database. Check MariaDB is running and .env is configured.",
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
