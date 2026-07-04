import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SOA_PRINT_OPTIONS,
  type SOAPrintOptions,
  type SOAPrintStatus,
  type SOAPrintViewMode,
} from "@/components/billing/soaPrintOptions";

type SOAPrintOptionsModalProps = {
  open: boolean;
  options: SOAPrintOptions;
  onChange: (options: SOAPrintOptions) => void;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  confirmLabel?: string;
};

function RadioRow<T extends string>({
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

export function SOAPrintOptionsModal({
  open,
  options,
  onChange,
  onCancel,
  onConfirm,
  title = "Print Option",
  confirmLabel = "Print",
}: SOAPrintOptionsModalProps) {
  if (!open) return null;

  const set = (patch: Partial<SOAPrintOptions>) => onChange({ ...options, ...patch });

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

        <div className="space-y-5 p-5 text-card-foreground">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-2">
              <RadioRow
                name="soa-status"
                value={"Final" as SOAPrintStatus}
                selected={options.status}
                label="Final"
                onSelect={(status) => set({ status })}
              />
              <RadioRow
                name="soa-status"
                value={"Tentative" as SOAPrintStatus}
                selected={options.status}
                label="Tentative"
                onSelect={(status) => set({ status })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Final = official copy. Tentative = draft preview with watermark.
            </p>
          </div>

          {/* View mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              View Mode
            </Label>
            <div className="space-y-1 rounded-md border p-2">
              <RadioRow
                name="soa-view"
                value={"details" as SOAPrintViewMode}
                selected={options.viewMode}
                label="Details Only"
                onSelect={(viewMode) => set({ viewMode })}
              />
              <RadioRow
                name="soa-view"
                value={"summary" as SOAPrintViewMode}
                selected={options.viewMode}
                label="Summary Only"
                onSelect={(viewMode) => set({ viewMode })}
              />
              <RadioRow
                name="soa-view"
                value={"both" as SOAPrintViewMode}
                selected={options.viewMode}
                label="Details & Summary"
                onSelect={(viewMode) => set({ viewMode })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Details = itemized charges. Summary = totals by category (Medicine, Lab, Room, PF,
              etc.).
            </p>
          </div>

          {/* Processing checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Processing Options
            </Label>
            <div className="space-y-2 rounded-md border p-3">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                  checked={options.forPhilHealth}
                  onChange={(e) => set({ forPhilHealth: e.target.checked })}
                />
                <span>
                  <span className="font-medium">For PhilHealth Claim Processing</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Formats the SOA with PhilHealth fee columns and professional-fee section.
                  </span>
                </span>
              </label>
            </div>
          </div>
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

export { DEFAULT_SOA_PRINT_OPTIONS };
