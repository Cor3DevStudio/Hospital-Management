import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserRound } from "lucide-react";

import { PatientClinicalHistory } from "@/components/PatientClinicalHistory";
import { PatientSearchModal } from "@/components/PatientSearchModal";
import { ReAdmissionBanner } from "@/components/ReAdmissionBanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPatientAdmissionSummary } from "@/lib/services/admissionService";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import { useStore, type Admission, type Patient } from "@/lib/store";
import { cn } from "@/lib/utils";

export type PatientSearchWithHistoryProps = {
  patients: Patient[];
  selectedPatientId: string;
  onSelect: (id: string) => void;
  /** Button label when no patient is selected. */
  label?: string;
  /** Button label when a patient is already selected. */
  changeLabel?: string;
  showArchived?: boolean;
  /** Show compact admission history below the button after selection. Default: true. */
  showAdmissionHistory?: boolean;
  /** History only — no search button (e.g. Patients registry form). */
  hideSearch?: boolean;
  /** Load admission into the current module form (e.g. Admission page). */
  onViewAdmission?: (admissionId: string) => void;
  /** Exclude an admission from prior-history counts (e.g. record being edited). */
  excludeAdmissionId?: string;
  allowCreate?: boolean;
  /** Stretch the trigger button to full width (forms/side panels). Default: true. */
  fullWidth?: boolean;
  /** Show selected patient name/ID above the button. Default: true. */
  showSelectedSummary?: boolean;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
  className?: string;
  /** Show inline registration in the search modal. Default: true. */
  allowCreate?: boolean;
  /** @deprecated Inline list/table layouts removed. */
  layout?: "table" | "list";
  /** @deprecated Results are fully scrollable in the modal. */
  maxResults?: number;
};

/**
 * Standard patient lookup used across modules:
 * "Search Patient" button opens a centered modal; selection populates the module
 * and shows previous admission history below the trigger.
 */
export function PatientSearchWithHistory({
  patients,
  selectedPatientId,
  onSelect,
  label = "Search Patient",
  changeLabel = "Change Patient",
  showArchived = false,
  showAdmissionHistory = true,
  hideSearch = false,
  onViewAdmission,
  excludeAdmissionId,
  allowCreate = true,
  fullWidth = true,
  showSelectedSummary = true,
  buttonVariant = "outline",
  buttonSize = "default",
  buttonClassName,
  className,
}: PatientSearchWithHistoryProps) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detailAdmission, setDetailAdmission] = useState<Admission | null>(null);

  const selectedPatient = useMemo(
    () =>
      patients.find((p) => p.id === selectedPatientId) ??
      state.patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId, state.patients],
  );

  const admissionSummary = useMemo(
    () =>
      selectedPatientId
        ? getPatientAdmissionSummary(state, selectedPatientId, { excludeAdmissionId })
        : null,
    [state, selectedPatientId, excludeAdmissionId],
  );

  const admissions = admissionSummary?.admissions ?? [];

  const handleViewAdmission = (admissionId: string) => {
    if (onViewAdmission) {
      onViewAdmission(admissionId);
      return;
    }
    const admission = state.admissions.find((a) => a.id === admissionId);
    if (admission) setDetailAdmission(admission);
  };

  if (hideSearch) {
    if (!showAdmissionHistory) return null;
    return (
      <div className={cn("min-w-0", className)}>
        <PatientClinicalHistory
          state={state}
          patient={selectedPatient}
          admissions={admissions}
          admissionSummary={admissionSummary ?? undefined}
          compact
          listLayout
          onViewAdmission={handleViewAdmission}
        />
        <AdmissionDetailDialog
          admission={detailAdmission}
          patient={selectedPatient}
          onClose={() => setDetailAdmission(null)}
          onOpenAdmissions={() => {
            setDetailAdmission(null);
            navigate({ to: "/admission" });
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      {showSelectedSummary && selectedPatient && (
        <div className="space-y-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{formatPatientName(selectedPatient)}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {selectedPatient.id}
                  {selectedPatient.contactNumber ? ` · ${selectedPatient.contactNumber}` : ""}
                </p>
              </div>
            </div>
          </div>
          {admissionSummary && <ReAdmissionBanner summary={admissionSummary} compact />}
        </div>
      )}

      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        className={cn(fullWidth && "w-full", buttonClassName)}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        {selectedPatient ? changeLabel : label}
      </Button>

      <PatientSearchModal
        open={open}
        onOpenChange={setOpen}
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelect={onSelect}
        showArchived={showArchived}
        title={label}
        excludeAdmissionId={excludeAdmissionId}
        allowCreate={allowCreate}
      />

      {showAdmissionHistory && (
        <PatientClinicalHistory
          state={state}
          patient={selectedPatient}
          admissions={admissions}
          admissionSummary={admissionSummary ?? undefined}
          compact
          listLayout
          onViewAdmission={handleViewAdmission}
        />
      )}

      <AdmissionDetailDialog
        admission={detailAdmission}
        patient={selectedPatient}
        onClose={() => setDetailAdmission(null)}
        onOpenAdmissions={() => {
          setDetailAdmission(null);
          navigate({ to: "/admission" });
        }}
      />
    </div>
  );
}

function AdmissionDetailDialog({
  admission,
  patient,
  onClose,
  onOpenAdmissions,
}: {
  admission: Admission | null;
  patient: Patient | undefined;
  onClose: () => void;
  onOpenAdmissions: () => void;
}) {
  return (
    <Dialog open={!!admission} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Admission Details</DialogTitle>
        </DialogHeader>
        {admission && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-muted-foreground">Patient:</span>{" "}
              {formatPatientName(patient)}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Date:</span>{" "}
              {admission.admissionDate}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Ward:</span> {admission.roomWard}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Doctor:</span>{" "}
              {admission.attendingDoctor}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Type:</span>{" "}
              {admission.admissionType}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">Status:</span> {admission.status}
            </p>
            {admission.dischargeDate && (
              <p>
                <span className="font-medium text-muted-foreground">Discharge:</span>{" "}
                {admission.dischargeDate}
              </p>
            )}
            <p>
              <span className="font-medium text-muted-foreground">Diagnosis / Notes:</span>{" "}
              {admission.notes || "—"}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button size="sm" onClick={onOpenAdmissions}>
                Open Admissions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
