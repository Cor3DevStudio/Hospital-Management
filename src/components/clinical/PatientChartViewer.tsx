import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PatientChartDocument } from "@/components/clinical/PatientChartDocument";
import type { PatientChartModel } from "@/components/clinical/buildPatientChartModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateAttachmentFile } from "@/lib/attachmentValidation";
import type { Attachment } from "@/lib/store";

type PatientChartViewerProps = {
  model: PatientChartModel;
  onUploadAttachment?: (file: File) => Promise<void>;
  onDeleteAttachment?: (attachmentId: string) => Promise<void>;
  onOpenAttachment?: (attachment: Attachment) => Promise<void>;
  onDownloadAttachment?: (attachment: Attachment) => Promise<void>;
};

/** On-screen medical chart viewer with optional attachment management (Patients module). */
export function PatientChartViewer({
  model,
  onUploadAttachment,
  onDeleteAttachment,
  onOpenAttachment,
  onDownloadAttachment,
}: PatientChartViewerProps) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Medical Chart Viewer</h3>
        <p className="text-[11px] text-muted-foreground">
          Recent OPD visits, prescriptions, billing activity, and clinical history for this patient.
        </p>
      </div>

      <PatientChartDocument model={model} />

      {onUploadAttachment ? (
        <div className="rounded-md border bg-white p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Attachments
          </p>
          <div className="mt-2 space-y-2">
            <Input
              type="file"
              multiple
              accept="application/pdf,application/xml,text/xml,image/jpeg,image/png,.pdf,.xml,.jpg,.jpeg,.png"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0 || !onUploadAttachment) return;
                let uploaded = 0;
                for (const file of files) {
                  const validation = validateAttachmentFile(file);
                  if (!validation.valid) {
                    toast.error(validation.message);
                    continue;
                  }
                  try {
                    await onUploadAttachment(file);
                    uploaded += 1;
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : `Failed to upload ${file.name}`,
                    );
                  }
                }
                if (uploaded > 0) {
                  toast.success(
                    uploaded === 1 ? "Attachment uploaded" : `${uploaded} attachments uploaded`,
                  );
                }
                e.target.value = "";
              }}
            />
            <div className="space-y-2">
              {model.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents attached.</p>
              ) : (
                model.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{attachment.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(attachment.createdAt).toLocaleString()} ·{" "}
                        {(attachment.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onOpenAttachment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void onOpenAttachment(attachment)}
                        >
                          Open
                        </Button>
                      ) : null}
                      {onDownloadAttachment ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void onDownloadAttachment(attachment)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {onDeleteAttachment ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm("Delete this attachment?")) return;
                            await onDeleteAttachment(attachment.id);
                            toast.success("Attachment removed");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
