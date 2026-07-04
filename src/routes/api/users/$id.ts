import { createFileRoute } from "@tanstack/react-router";

import { isAuthError, requireAuth } from "@/lib/auth/apiAuth";
import {
  deleteUserById,
  updateUserActive,
  updateUserDarkMode,
  updateUserPageAccess,
} from "@/lib/db/repositories/users";

type PatchUserBody = {
  active?: boolean;
  darkMode?: boolean;
  pageAccess?: string[];
};

export const Route = createFileRoute("/api/users/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const body = (await request.json()) as PatchUserBody;
          const { id } = params;

          if (body.active !== undefined) {
            const ok = await updateUserActive(id, body.active);
            if (!ok) {
              return Response.json(
                { success: false, message: "Unable to update user access." },
                { status: 400 }
              );
            }
          }

          if (body.darkMode !== undefined) {
            await updateUserDarkMode(id, body.darkMode);
          }

          if (body.pageAccess !== undefined) {
            if (!Array.isArray(body.pageAccess)) {
              return Response.json(
                { success: false, message: "pageAccess must be an array of paths." },
                { status: 400 }
              );
            }
            const ok = await updateUserPageAccess(id, body.pageAccess);
            if (!ok) {
              return Response.json(
                { success: false, message: "Unable to update page access." },
                { status: 400 }
              );
            }
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error("[api/users/$id PATCH]", error);
          return Response.json(
            { success: false, message: "Unable to update user." },
            { status: 503 }
          );
        }
      },
      DELETE: async ({ request, params }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const ok = await deleteUserById(params.id);
          if (!ok) {
            return Response.json(
              { success: false, message: "Cannot delete this user account." },
              { status: 400 }
            );
          }
          return Response.json({ success: true });
        } catch (error) {
          console.error("[api/users/$id DELETE]", error);
          return Response.json(
            { success: false, message: "Unable to delete user." },
            { status: 503 }
          );
        }
      },
    },
  },
});
