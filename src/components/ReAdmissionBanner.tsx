import { AlertTriangle, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PatientAdmissionSummary } from "@/lib/services/admissionService";
import { cn } from "@/lib/utils";

type ReAdmissionBannerProps = {
  summary: PatientAdmissionSummary;
  compact?: boolean;
  className?: string;
};

export function ReAdmissionBanner({ summary, compact, className }: ReAdmissionBannerProps) {
  if (!summary.isReAdmission) return null;

  const countLabel =
    summary.priorCount === 1 ? "1 prior admission" : `${summary.priorCount} prior admissions`;

  return (
    <div
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 text-amber-950",
        compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={cn(
            "shrink-0 text-amber-600",
            compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4",
          )}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("font-semibold leading-snug", compact && "text-xs")}>
            Re-admission — patient has {countLabel}
          </p>
          {!compact && summary.latestAdmission && (
            <p className="text-xs text-amber-900/80">
              Most recent: {summary.latestAdmission.admissionDate}
              {summary.latestAdmission.roomWard ? ` · ${summary.latestAdmission.roomWard}` : ""}
              {summary.latestAdmission.status ? ` · ${summary.latestAdmission.status}` : ""}
            </p>
          )}
          {summary.isCurrentlyAdmitted && (
            <Badge
              variant="outline"
              className="border-amber-300 bg-white/70 text-[10px] text-amber-900"
            >
              Currently admitted
            </Badge>
          )}
        </div>
        <History
          className={cn("shrink-0 text-amber-500/70", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        />
      </div>
    </div>
  );
}

export function PriorAdmissionBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Badge
      variant="outline"
      className="shrink-0 border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-900"
      title={`${count} prior admission${count === 1 ? "" : "s"}`}
    >
      Re-admit · {count}
    </Badge>
  );
}
