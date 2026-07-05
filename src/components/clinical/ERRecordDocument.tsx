import type { ERRecord, HospitalInfo, Patient } from "@/lib/store";
import {
  ClinicalDocumentShell,
  ClinicalNotesBlock,
  ClinicalPrintField,
  ClinicalPrintSection,
  PatientDemographicsGrid,
  StatusBadge,
} from "@/components/clinical/ClinicalPrintShared";

export type ERRecordDocumentProps = {
  hospital: HospitalInfo;
  record: ERRecord;
  patient: Patient | undefined;
  preparedBy?: string;
};

function triageTone(level: ERRecord["triageLevel"]): { bg: string; fg: string; border: string } {
  if (level === "Red") return { bg: "#fef2f2", fg: "#991b1b", border: "#fca5a5" };
  if (level === "Yellow") return { bg: "#fffbeb", fg: "#92400e", border: "#fcd34d" };
  if (level === "Green") return { bg: "#ecfdf5", fg: "#166534", border: "#86efac" };
  return { bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" };
}

export function ERRecordDocument({ hospital, record, patient, preparedBy }: ERRecordDocumentProps) {
  const tone = triageTone(record.triageLevel);

  return (
    <ClinicalDocumentShell
      hospital={hospital}
      title="Emergency Room Record"
      subtitle="ER triage, treatment, and disposition"
      recordId={record.id}
      preparedBy={preparedBy || record.attendingDoctor}
      footerNote="Confidential clinical record — for hospital use only"
      statusBadge={<StatusBadge label={`${record.triageLevel} · ${record.status}`} {...tone} />}
    >
      <ClinicalPrintSection title="Patient Information">
        <PatientDemographicsGrid patient={patient} />
      </ClinicalPrintSection>

      <ClinicalPrintSection title="ER Visit Details">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ClinicalPrintField label="Arrival Date" value={record.arrivalDate} />
          <ClinicalPrintField label="Arrival Time" value={record.arrivalTime} />
          <ClinicalPrintField label="Triage Level" value={record.triageLevel} />
          <ClinicalPrintField label="Case Status" value={record.status} />
          <ClinicalPrintField label="Disposition" value={record.disposition ?? "—"} />
          <ClinicalPrintField label="Attending Doctor" value={record.attendingDoctor} />
          <ClinicalPrintField label="Attending Nurse" value={record.attendingNurse ?? "—"} />
          {record.admissionId ? (
            <ClinicalPrintField label="Linked Admission" value={record.admissionId} />
          ) : null}
        </div>
      </ClinicalPrintSection>

      <ClinicalPrintSection title="Chief Complaint">
        <ClinicalNotesBlock text={record.chiefComplaint || "—"} />
      </ClinicalPrintSection>

      {record.notes?.trim() ? (
        <ClinicalPrintSection title="Clinical Notes">
          <ClinicalNotesBlock text={record.notes} />
        </ClinicalPrintSection>
      ) : null}
    </ClinicalDocumentShell>
  );
}
