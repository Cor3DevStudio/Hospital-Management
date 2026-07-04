import { createFileRoute } from "@tanstack/react-router";

import { isAuthError, requireAuth } from "@/lib/auth/apiAuth";
import { loadClinicalStateFromDatabase } from "@/lib/db/repositories/clinicalState";

export const Route = createFileRoute("/api/sync/load")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const result = await loadClinicalStateFromDatabase();
          return Response.json(result);
        } catch (error) {
          console.error("[api/sync/load]", error);
          return Response.json(
            {
              payload: null,
              updatedAt: null,
              message: "Unable to load from database. Check MariaDB connection.",
            },
            { status: 503 }
          );
        }
      },
    },
  },
});
