import { createFileRoute } from "@tanstack/react-router";

/** Home redirect is handled in `__root.tsx` (`AuthenticatedLayout`) using per-user page access. */
export const Route = createFileRoute("/")({
  component: () => null,
});
