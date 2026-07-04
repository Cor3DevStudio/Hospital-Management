import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy route — Consultation module was renamed to OPD. */
export const Route = createFileRoute("/consultations")({
  head: () => ({ meta: [{ title: "OPD — Hospital CMS" }] }),
  component: () => <Navigate to="/opd" />,
});
