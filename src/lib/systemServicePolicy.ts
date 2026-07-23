/** Client-facing service & storage policy after the sidebar upgrade. */

export const MAINTENANCE_FIX_FEE_PHP = 7000;
export const MAINTENANCE_FIX_FEE_LABEL = "₱7,000";

export const FIXED_SERVICE_COSTING = {
  retainerMonthlyPhp: 15_000,
  revisionEachPhp: 5_000,
  storageOverrunPhp: 7_000,
  hostedDbMigrationWeProvidePhp: 40_000,
  hostedDbMigrationClientProvidesPhp: 30_000,
} as const;

/**
 * Formal notice for clients after the sidebar rework and 5GB storage upgrade.
 */
export const SYSTEM_SERVICE_POLICY_MESSAGE = `IMPORTANT SYSTEM NOTICE

Effective immediately after the recent Sidebar update, we are no longer accepting free reworks or free revisions of the system.

All future changes, customizations, and revisions to your system will be charged accordingly.

We have upgraded your whole system storage capacity from 2GB to 5GB to maximize performance, reduce lagging, and keep our optimizations fully reflected on your current system.

Please do not ignore the 5GB storage limit. If storage becomes overdue, or if you continue adding data beyond 5GB, the system will enter maintenance mode.

If 5GB is no longer enough, we recommend switching from MariaDB to a Hosted Database to avoid storage-related issues.

FIXED SERVICE COSTING
• Monthly Retainer — ₱15,000
• Revisions / Changes — ₱5,000 each
• Storage Overrun Recovery — ₱7,000
• Hosted DB Migration (we provide hosting) — ₱40,000
• Hosted DB Migration (you provide hosting) — ₱30,000

Thank you for your understanding and continued support.`;

/** Short notice for Settings UI. */
export const SYSTEM_SERVICE_POLICY_SUMMARY =
  "Free reworks and revisions are no longer accepted. Storage upgraded 2GB → 5GB. Fixed costing: Retainer ₱15,000/mo · Revisions ₱5,000 each · Storage overrun ₱7,000 · Hosted DB migration ₱40,000 (we provide) / ₱30,000 (you provide).";

/** Terminal / lock-file line when storage security trips. */
export const STORAGE_OVERDUE_MAINTENANCE_FEE_LINE = `Maintenance for fixing your system after exceeding the 5GB limit: ${MAINTENANCE_FIX_FEE_LABEL} (7,000 Pesos).`;
