import { createFileRoute } from "@tanstack/react-router";

import type { UserRole } from "@/lib/auth/types";
import { isAuthError, requireAuth } from "@/lib/auth/apiAuth";
import { createUserForStore, listUsersForStore } from "@/lib/db/repositories/users";

type CreateUserBody = {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export const Route = createFileRoute("/api/users/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const users = await listUsersForStore();
          return Response.json(users);
        } catch (error) {
          console.error("[api/users]", error);
          return Response.json(
            { message: "Unable to load users. Check database connection." },
            { status: 503 }
          );
        }
      },
      POST: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const body = (await request.json()) as CreateUserBody;

          if (!body?.username?.trim() || !body?.fullName?.trim() || !body?.password) {
            return Response.json(
              { success: false, message: "Username, full name, and password are required." },
              { status: 400 }
            );
          }

          if (body.password.length < 6) {
            return Response.json(
              { success: false, message: "Password must be at least 6 characters." },
              { status: 400 }
            );
          }

          const user = await createUserForStore({
            username: body.username.trim(),
            password: body.password,
            fullName: body.fullName.trim(),
            role: body.role ?? "Receptionist",
          });

          if (!user) {
            return Response.json(
              { success: false, message: "Username already exists." },
              { status: 409 }
            );
          }

          return Response.json({ success: true, user }, { status: 201 });
        } catch (error) {
          console.error("[api/users POST]", error);
          return Response.json(
            { success: false, message: "Unable to create user. Check database connection." },
            { status: 503 }
          );
        }
      },
    },
  },
});
