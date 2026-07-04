import type { ReactNode } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ReportPrintOptionsModalProps = {
  open: boolean;
  title?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
};

export function RadioRow<T extends string>({
  name,
  value,
  selected,
  label,
  onSelect,
}: {
  name: string;
  value: T;
  selected: T;
  label: string;
  onSelect: (v: T) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60">
      <input
        type="radio"
        name={name}
        className="h-4 w-4 accent-blue-600"
        checked={selected === value}
        onChange={() => onSelect(value)}
      />
      <span>{label}</span>
    </label>
  );
}

export function OptionSection({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="rounded-md border p-2">{children}</div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ReportPrintOptionsModal({
  open,
  title = "Print Option",
  confirmLabel = "Preview",
  onCancel,
  onConfirm,
  children,
}: ReportPrintOptionsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm no-print">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={onCancel}
          >
            ✕
          </Button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto p-5 text-card-foreground">
          {children}
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={onConfirm}
          >
            <Printer className="mr-1 h-4 w-4" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
