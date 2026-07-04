import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { filterPatients } from "@/components/PatientSearch";
import { getPatientAdmissions } from "@/lib/services/admissionService";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import { useStore, type Patient } from "@/lib/store";

export type PatientSearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  selectedPatientId?: string;
  onSelect: (patientId: string) => void;
  showArchived?: boolean;
  title?: string;
  description?: string;
};

function patientFullName(patient: Patient) {
  return `${patient.lastName}, ${patient.firstName}${patient.middleName ? ` ${patient.middleName}` : ""}${patient.suffix ? ` ${patient.suffix}` : ""}`;
}

/**
 * Centered patient lookup dialog — search input, live results, admission history preview.
 * Close via X, overlay click, or Escape (Radix Dialog defaults).
 */
export function PatientSearchModal({
  open,
  onOpenChange,
  patients,
  selectedPatientId = "",
  onSelect,
  showArchived = false,
  title = "Search Patient",
  description = "Search by name, patient ID, contact, or PhilHealth PIN.",
}: PatientSearchModalProps) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPreviewId(selectedPatientId || null);
  }, [open, selectedPatientId]);

  const filtered = useMemo(
    () => filterPatients(patients, query, showArchived),
    [patients, query, showArchived]
  );

  const previewPatient =
    patients.find((p) => p.id === previewId) ??
    state.patients.find((p) => p.id === previewId);

  const admissions = useMemo(
    () => (previewId ? getPatientAdmissions(state, previewId) : []),
    [state, previewId]
  );

  const handleSelect = (patientId: string) => {
    onSelect(patientId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,720px)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-4 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, patient ID, contact, or PhilHealth PIN…"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No patients found</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((patient) => {
                const selected = patient.id === selectedPatientId;
                const previewing = patient.id === previewId;
                return (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setPreviewId(patient.id)}
                      onFocus={() => setPreviewId(patient.id)}
                      onClick={() => handleSelect(patient.id)}
                      className={`flex w-full flex-col gap-0.5 rounded-md border px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted ${
                        selected || previewing ? "border-primary/40 bg-muted" : "border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug break-words">
                          {patientFullName(patient)}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0 text-[10px] font-medium ${
                            patient.archived
                              ? "border-warning/30 bg-warning/15 text-warning-foreground"
                              : "border-success/20 bg-success/15 text-success"
                          }`}
                        >
                          {patient.archived ? "Archived" : "Active"}
                        </span>
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {patient.id}
                        {patient.contactNumber ? ` · ${patient.contactNumber}` : ""}
                        {patient.philhealth?.memberNumber
                          ? ` · PIN ${patient.philhealth.memberNumber}`
                          : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="max-h-44 shrink-0 overflow-y-auto border-t bg-muted/30 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Previous Admission History
          </p>
          {!previewPatient ? (
            <p className="text-xs text-muted-foreground">
              Hover a result to preview admission history, then click to select.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold break-words">{formatPatientName(previewPatient)}</p>
              {admissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No previous admissions found.</p>
              ) : (
                <ul className="space-y-1.5">
                  {admissions.slice(0, 5).map((admission) => (
                    <li
                      key={admission.id}
                      className="flex items-start justify-between gap-2 rounded-md border bg-card px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold whitespace-nowrap">{admission.admissionDate}</span>
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {admission.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 break-words font-medium">{admission.roomWard || "—"}</p>
                        {(admission.notes || admission.attendingDoctor) && (
                          <p className="mt-0.5 line-clamp-1 text-muted-foreground">
                            {admission.notes || admission.attendingDoctor}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                  {admissions.length > 5 && (
                    <p className="text-[11px] text-muted-foreground">
                      +{admissions.length - 5} more admission{admissions.length - 5 === 1 ? "" : "s"}
                    </p>
                  )}
                </ul>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-1 h-8 w-full text-xs"
                onClick={() => handleSelect(previewPatient.id)}
              >
                Select {formatPatientName(previewPatient)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
