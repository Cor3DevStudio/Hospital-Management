import { createFileRoute } from "@tanstack/react-router";

import { isAuthError, requireAuth } from "@/lib/auth/apiAuth";
import { saveClinicalStateToDatabase } from "@/lib/db/repositories/clinicalState";
import {
  enforceMariaDbStorageQuota,
  MAX_MARIADB_STORAGE_BYTES,
} from "@/lib/db/storageSecurity";
import type { ClinicalPayload } from "@/lib/types/clinicalPayload";

export const Route = createFileRoute("/api/sync/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          // Hard reject a single request body over the 5GB MariaDB security cap.
          const contentLength = Number(request.headers.get("content-length") ?? 0);
          if (Number.isFinite(contentLength) && contentLength > MAX_MARIADB_STORAGE_BYTES) {
            await enforceMariaDbStorageQuota(contentLength);
          }

          const payload = (await request.json()) as ClinicalPayload;

          if (!payload || typeof payload !== "object") {
            return Response.json(
              { success: false, message: "Invalid clinical payload." },
              { status: 400 },
            );
          }

          const result = await saveClinicalStateToDatabase(payload);
          return Response.json(result);
        } catch (error) {
          console.error("[api/sync/save]", error);
          const message = error instanceof Error ? error.message : "Database save failed.";
          return Response.json(
            {
              success: false,
              message: `Unable to save to database. ${message} Ensure MariaDB is running and run database/install_all.sql.`,
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
