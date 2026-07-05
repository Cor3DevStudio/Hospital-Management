import type { ReactNode } from "react";

import { computeAge } from "@/lib/services/patientService";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import type { HospitalInfo, Patient } from "@/lib/store";

export function ClinicalPrintField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 border-b border-slate-200 pb-1 text-[12px] font-medium text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

export function ClinicalPrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 border-l-4 border-slate-800 pl-2 text-[11px] font-bold uppercase tracking-wide text-slate-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ClinicalNotesBlock({ text }: { text: string }) {
  return (
    <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
      {text}
    </p>
  );
}

export function HospitalLetterhead({ hospital }: { hospital: HospitalInfo }) {
  return (
    <header className="border-b border-slate-300 pb-3 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-900">{hospital.name}</p>
      <p className="mt-0.5 text-[10px] text-slate-600">{hospital.address}</p>
      <p className="text-[10px] text-slate-600">
        Tel: {hospital.phone}
        {hospital.email ? `  ·  ${hospital.email}` : ""}
      </p>
      {hospital.philhealthAccreditation ? (
        <p className="mt-0.5 text-[10px] font-medium text-slate-700">
          PhilHealth Accreditation No.: {hospital.philhealthAccreditation}
        </p>
      ) : null}
    </header>
  );
}

export function PatientDemographicsGrid({ patient }: { patient: Patient | undefined }) {
  const age = patient?.birthDate ? computeAge(patient.birthDate) : null;
  const address = patient
    ? [patient.address.street, patient.address.barangay, patient.address.city, patient.address.province]
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <ClinicalPrintField label="Patient Name" value={formatPatientName(patient).toUpperCase()} />
      <ClinicalPrintField label="Patient ID" value={patient?.id ?? "—"} />
      <ClinicalPrintField label="Date of Birth" value={patient?.birthDate ?? "—"} />
      <ClinicalPrintField label="Age / Sex" value={patient ? `${age ?? "—"} / ${patient.gender}` : "—"} />
      <ClinicalPrintField
        label="PhilHealth PIN"
        value={patient?.philhealth?.memberNumber?.trim() || "—"}
      />
      <ClinicalPrintField label="Contact No." value={patient?.contactNumber ?? "—"} />
      <ClinicalPrintField label="Address" value={address} />
      <ClinicalPrintField label="Civil Status" value={patient?.civilStatus ?? "—"} />
    </div>
  );
}

export function ClinicalDocumentFooter({
  hospital,
  preparedBy,
  footerNote,
}: {
  hospital: HospitalInfo;
  preparedBy?: string;
  footerNote: string;
}) {
  const printedAt = new Date().toLocaleString();

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-10 text-[10px] text-slate-700">
        <div>
          <p className="font-semibold text-slate-900">Attending Physician / Prepared by</p>
          <div className="mt-10 border-b border-slate-400" />
          <p className="mt-1 text-slate-500">{preparedBy || "Signature over printed name"}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Date / Time Printed</p>
          <div className="mt-10 border-b border-slate-400" />
          <p className="mt-1 text-slate-500">{printedAt}</p>
        </div>
      </div>
      <p className="mt-6 text-center text-[9px] text-slate-400">
        {footerNote} · {hospital.name}
      </p>
    </>
  );
}

export function StatusBadge({
  label,
  bg,
  fg,
  border,
}: {
  label: string;
  bg: string;
  fg: string;
  border: string;
}) {
  return (
    <div
      className="shrink-0 rounded border px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide"
      style={{ background: bg, color: fg, borderColor: border }}
    >
      {label}
    </div>
  );
}

export function ClinicalDocumentShell({
  hospital,
  title,
  subtitle,
  recordId,
  statusBadge,
  children,
  preparedBy,
  footerNote,
}: {
  hospital: HospitalInfo;
  title: string;
  subtitle: string;
  recordId: string;
  statusBadge?: ReactNode;
  children: ReactNode;
  preparedBy?: string;
  footerNote: string;
}) {
  return (
    <div className="clinical-doc clinical-page border border-slate-200 bg-white p-6 text-black shadow-sm print:border-0 print:p-0 print:shadow-none">
      <HospitalLetterhead hospital={hospital} />

      <div className="mt-4 flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-3">
        <div>
          <h1 className="text-base font-bold uppercase tracking-wide text-slate-900">{title}</h1>
          <p className="mt-0.5 text-[11px] text-slate-600">{subtitle}</p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">Record No.: {recordId}</p>
        </div>
        {statusBadge}
      </div>

      {children}

      <ClinicalDocumentFooter hospital={hospital} preparedBy={preparedBy} footerNote={footerNote} />
    </div>
  );
}
