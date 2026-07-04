import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b bg-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatChip({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "success" | "warning" | "destructive" | "info" }) {
  const toneClass = {
    default: "bg-muted text-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  }[tone];
  return (
    <div className={`rounded-md px-3 py-1.5 text-sm font-medium ${toneClass}`}>
      <span className="opacity-70">{label}:</span> <span className="font-semibold">{value}</span>
    </div>
  );
}
