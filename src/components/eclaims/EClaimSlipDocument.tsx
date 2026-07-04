import { computeBillBalance, computeBillNetTotal } from "@/lib/services/billingService";
import type { Bill, EClaim, HospitalInfo, Patient } from "@/lib/store";

export type EClaimSlipDocumentProps = {
  hospital: HospitalInfo;
  claim: EClaim;
  patient: Patient | undefined;
  bill: Bill | undefined;
  preparedBy?: string;
};

function formatPatientName(patient: Patient | undefined): string {
  if (!patient) return "—";
  const middle = patient.middleName ? ` ${patient.middleName}` : "";
  return `${patient.lastName}, ${patient.firstName}${middle}`.toUpperCase();
}

function statusStyle(status: EClaim["claimStatus"]): { bg: string; fg: string; border: string } {
  if (status === "Approved") return { bg: "#ecfdf5", fg: "#166534", border: "#86efac" };
  if (status === "Submitted") return { bg: "#eff6ff", fg: "#1d4ed8", border: "#93c5fd" };
  if (status === "Denied") return { bg: "#fef2f2", fg: "#991b1b", border: "#fca5a5" };
  return { bg: "#fffbeb", fg: "#92400e", border: "#fcd34d" };
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 border-b border-slate-200 pb-1 text-[12px] font-medium text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

export function EClaimSlipDocument({
  hospital,
  claim,
  patient,
  bill,
  preparedBy,
}: EClaimSlipDocumentProps) {
  const printedAt = new Date().toLocaleString();
  const tone = statusStyle(claim.claimStatus);
  const philhealthNo = patient?.philhealth?.memberNumber?.trim() || "—";

  return (
    <div className="eclaims-doc eclaims-page border border-slate-200 bg-white p-6 text-black shadow-sm print:border-0 print:p-0 print:shadow-none">
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

      <div className="mt-4 flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-3">
        <div>
          <h1 className="text-base font-bold tracking-wide text-slate-900 uppercase">
            eClaim Summary Slip
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-600">PhilHealth electronic claim record</p>
        </div>
        <div
          className="shrink-0 rounded border px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide"
          style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
        >
          {claim.claimStatus}
        </div>
      </div>

      <section className="mt-4">
        <h2 className="mb-2 border-l-4 border-slate-800 pl-2 text-[11px] font-bold uppercase tracking-wide text-slate-800">
          Patient Information
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Patient Name" value={formatPatientName(patient)} />
          <Field label="PhilHealth PIN" value={philhealthNo} />
          <Field label="Membership" value={claim.philhealthStatus} />
          <Field
            label="Patient Type"
            value={bill?.patientType ?? "—"}
          />
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 border-l-4 border-slate-800 pl-2 text-[11px] font-bold uppercase tracking-wide text-slate-800">
          Claim Details
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Claim ID" value={claim.id} />
          <Field label="Linked Bill" value={claim.billId ?? "—"} />
          <Field label="Admission Date" value={claim.admissionDate} />
          <Field label="Room / Ward" value={claim.roomWard || "—"} />
          <Field label="Case Rate Code" value={claim.caseRateCode || "—"} />
          <Field
            label="Bill Net / Balance"
            value={
              bill
                ? `₱${computeBillNetTotal(bill).toLocaleString("en-PH", { minimumFractionDigits: 2 })} / ₱${computeBillBalance(bill).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                : "—"
            }
          />
          <Field label="Created" value={claim.createdAt ? new Date(claim.createdAt).toLocaleString() : "—"} />
          <Field label="Last Updated" value={claim.updatedAt ? new Date(claim.updatedAt).toLocaleString() : "—"} />
        </div>
      </section>

      {claim.notes?.trim() ? (
        <section className="mt-5">
          <h2 className="mb-2 border-l-4 border-slate-800 pl-2 text-[11px] font-bold uppercase tracking-wide text-slate-800">
            Notes
          </h2>
          <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-800">
            {claim.notes}
          </p>
        </section>
      ) : null}

      <div className="mt-8 grid grid-cols-2 gap-10 text-[10px] text-slate-700">
        <div>
          <p className="font-semibold text-slate-900">Prepared by</p>
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
        Confidential — for PhilHealth eClaims monitoring use only · {hospital.name}
      </p>
    </div>
  );
}
