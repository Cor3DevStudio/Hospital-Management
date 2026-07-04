import { useMemo } from "react";

import {
  buildDashboardSnapshotKey,
  computeDashboardMetrics,
  type DashboardMetrics,
} from "@/lib/services/dashboardMetrics";
import { useStore } from "@/lib/store";

const CACHE_TTL_MS = 45_000;

let metricsCache: {
  snapshot: string;
  metrics: DashboardMetrics;
  expiresAt: number;
} | null = null;

function getMetricsWithCache(state: ReturnType<typeof useStore>["state"]): DashboardMetrics {
  const snapshot = buildDashboardSnapshotKey(state);
  const now = Date.now();

  if (
    metricsCache &&
    metricsCache.snapshot === snapshot &&
    now < metricsCache.expiresAt
  ) {
    return metricsCache.metrics;
  }

  const metrics = computeDashboardMetrics(state);
  metricsCache = { snapshot, metrics, expiresAt: now + CACHE_TTL_MS };
  return metrics;
}

export function useDashboardMetrics(): DashboardMetrics {
  const { state } = useStore();
  return useMemo(() => getMetricsWithCache(state), [state]);
}

/** Clears dashboard cache after billing/payment mutations for fresher totals. */
export function invalidateDashboardMetricsCache(): void {
  metricsCache = null;
}
