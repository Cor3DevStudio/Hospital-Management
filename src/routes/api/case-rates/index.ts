import { createFileRoute } from "@tanstack/react-router";

import { isAuthError, requireAuth } from "@/lib/auth/apiAuth";
import {
  countCaseRatesInDatabase,
  deleteCaseRateFromDatabase,
  findCaseRateByCode,
  searchCaseRates,
  upsertCaseRateToDatabase,
} from "@/lib/db/repositories/caseRates";
import { enforceMariaDbStorageQuota, MAX_MARIADB_STORAGE_BYTES } from "@/lib/db/storageSecurity";
import type { CaseRate } from "@/lib/store";

export const Route = createFileRoute("/api/case-rates/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");

          // Single lookup by code (billing / calculator)
          if (code) {
            const caseRate = await findCaseRateByCode(code);
            return Response.json({ caseRate });
          }

          // Count only (settings)
          if (url.searchParams.get("countOnly") === "1") {
            const total = await countCaseRatesInDatabase();
            return Response.json({ total });
          }

          const result = await searchCaseRates({
            query: url.searchParams.get("q") ?? undefined,
            type: url.searchParams.get("type") ?? undefined,
            page: Number(url.searchParams.get("page") ?? 1),
            pageSize: Number(url.searchParams.get("pageSize") ?? 50),
          });

          return Response.json(result);
        } catch (error) {
          console.error("[api/case-rates GET]", error);
          return Response.json(
            { message: "Unable to load case rates from database." },
            { status: 503 },
          );
        }
      },

      POST: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          // Block writes when DB is already at/over 5GB; hard-reject oversized bodies.
          const contentLength = Number(request.headers.get("content-length") ?? 0);
          if (Number.isFinite(contentLength) && contentLength > MAX_MARIADB_STORAGE_BYTES) {
            await enforceMariaDbStorageQuota(contentLength);
          } else {
            await enforceMariaDbStorageQuota(0);
          }

          const body = (await request.json()) as CaseRate;
          if (!body?.code || !body?.description) {
            return Response.json(
              { message: "code and description are required." },
              { status: 400 },
            );
          }
          const saved = await upsertCaseRateToDatabase(body);
          return Response.json({ success: true, caseRate: saved });
        } catch (error) {
          console.error("[api/case-rates POST]", error);
          return Response.json({ message: "Unable to save case rate." }, { status: 503 });
        }
      },

      DELETE: async ({ request }) => {
        const authResult = await requireAuth(request);
        if (isAuthError(authResult)) return authResult;

        try {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          if (!id) {
            return Response.json({ message: "id is required." }, { status: 400 });
          }
          await deleteCaseRateFromDatabase(id);
          return Response.json({ success: true });
        } catch (error) {
          console.error("[api/case-rates DELETE]", error);
          return Response.json(
            { message: "Unable to delete case rate from database." },
            { status: 503 },
          );
        }
      },
    },
  },
});
