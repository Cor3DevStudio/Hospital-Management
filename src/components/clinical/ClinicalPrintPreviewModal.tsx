import type { ReactNode } from "react";
import { FileDown, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

type ClinicalPrintPreviewModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onPrint: () => void;
  onSavePdf?: () => void;
  children: ReactNode;
};

export function ClinicalPrintPreviewModal({
  open,
  title,
  subtitle,
  onClose,
  onPrint,
  onSavePdf,
  children,
}: ClinicalPrintPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm no-print">
      <div className="flex max-h-[90vh] w-full max-w-[900px] flex-col rounded-lg border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/40 p-4">
          <div className="mx-auto max-w-[210mm] rounded-md border border-border bg-white p-6 text-slate-900 shadow-sm">
            {children}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/40 p-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {onSavePdf ? (
            <Button variant="outline" size="sm" onClick={onSavePdf}>
              <FileDown className="mr-1 h-4 w-4" />
              Save as PDF
            </Button>
          ) : null}
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={onPrint}>
            <Printer className="mr-1 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
