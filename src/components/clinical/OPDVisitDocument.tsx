import type { Consultation, HospitalInfo, Patient } from "@/lib/store";
import {
  ClinicalDocumentShell,
  ClinicalNotesBlock,
  ClinicalPrintField,
  ClinicalPrintSection,
  PatientDemographicsGrid,
  StatusBadge,
} from "@/components/clinical/ClinicalPrintShared";

export type OPDVisitDocumentProps = {
  hospital: HospitalInfo;
  consultation: Consultation;
  patient: Patient | undefined;
  preparedBy?: string;
};

function visitStatusTone(status: Consultation["status"]): { bg: string; fg: string; border: string } {
  if (status === "Seen") return { bg: "#ecfdf5", fg: "#166534", border: "#86efac" };
  return { bg: "#fffbeb", fg: "#92400e", border: "#fcd34d" };
}

export function OPDVisitDocument({ hospital, consultation, patient, preparedBy }: OPDVisitDocumentProps) {
  const tone = visitStatusTone(consultation.status);
  const prescriptions = consultation.prescriptions.filter(
    (rx) => rx.medicine.trim() || rx.dosage.trim() || rx.instructions.trim()
  );

  return (
    <ClinicalDocumentShell
      hospital={hospital}
      title="Outpatient Consultation Record"
      subtitle="OPD visit summary and clinical prescription"
      recordId={consultation.id}
      preparedBy={preparedBy || consultation.doctor}
      footerNote="Confidential clinical record — for hospital use only"
      statusBadge={<StatusBadge label={consultation.status} {...tone} />}
    >
      <ClinicalPrintSection title="Patient Information">
        <PatientDemographicsGrid patient={patient} />
      </ClinicalPrintSection>

      <ClinicalPrintSection title="Visit Details">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ClinicalPrintField label="Visit Date" value={consultation.date} />
          <ClinicalPrintField label="Attending Doctor" value={consultation.doctor} />
          <ClinicalPrintField label="Chief Complaint" value={consultation.chiefComplaint} />
          <ClinicalPrintField label="Diagnosis" value={consultation.diagnosis || "—"} />
          <ClinicalPrintField
            label="Discharge Status"
            value={consultation.discharged ? `Seen${consultation.dischargeDate ? ` · ${consultation.dischargeDate}` : ""}` : "Pending"}
          />
        </div>
      </ClinicalPrintSection>

      {consultation.notes?.trim() ? (
        <ClinicalPrintSection title="Clinical Notes">
          <ClinicalNotesBlock text={consultation.notes} />
        </ClinicalPrintSection>
      ) : null}

      <ClinicalPrintSection title="Prescriptions">
        {prescriptions.length > 0 ? (
          <table className="w-full border-collapse text-[11px] text-slate-800">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-left text-[9px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-1.5 font-semibold">Medicine</th>
                <th className="px-2 py-1.5 font-semibold">Dosage</th>
                <th className="px-2 py-1.5 font-semibold">Sig / Instructions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((rx, index) => (
                <tr key={`${rx.medicine}-${index}`} className="border-b border-slate-200">
                  <td className="px-2 py-1.5 font-medium">{rx.medicine || "—"}</td>
                  <td className="px-2 py-1.5">{rx.dosage || "—"}</td>
                  <td className="px-2 py-1.5">{rx.instructions || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[11px] text-slate-500">No prescriptions recorded for this visit.</p>
        )}
      </ClinicalPrintSection>
    </ClinicalDocumentShell>
  );
}
