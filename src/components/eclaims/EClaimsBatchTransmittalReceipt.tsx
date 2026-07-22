import type { Admission, Bill, EClaim, HospitalInfo, Patient } from "@/lib/store";
import {
  formatClaimSeriesLhio,
  resolveClaimDates,
  type BatchTransmittalMeta,
} from "@/lib/services/eclaimService";

export type EClaimsBatchTransmittalReceiptProps = {
  hospital: HospitalInfo;
  meta: BatchTransmittalMeta;
  claims: EClaim[];
  patientMap: Map<string, Patient>;
  billMap: Map<string, Bill>;
  admissions: Admission[];
  preparedBy?: string;
  showHeader?: boolean;
};

function formatDisplayDate(isoOrDisplay: string | undefined): string {
  if (!isoOrDisplay) return "—";
  const raw = isoOrDisplay.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${m}-${d}-${y}`;
  }
  return isoOrDisplay;
}

function patientParts(patient: Patient | undefined) {
  return {
    lastName: patient?.lastName?.toUpperCase() || "—",
    firstName: patient?.firstName?.toUpperCase() || "—",
    middleName: patient?.middleName?.toUpperCase() || "",
    suffix: patient?.suffix?.toUpperCase() || "",
  };
}

/**
 * Batch eClaims transmittal receipt — inspired by PhilHealth receipt layout,
 * custom Hospital CMS template (not an official PhilHealth form).
 */
export function EClaimsBatchTransmittalReceipt({
  hospital,
  meta,
  claims,
  patientMap,
  billMap,
  admissions,
  preparedBy,
  showHeader = true,
}: EClaimsBatchTransmittalReceiptProps) {
  const printedAt = new Date().toLocaleString();

  return (
    <div className="eclaims-doc bg-white text-black">
      <section className="eclaims-page border border-slate-200 bg-white p-6 shadow-sm print:mb-0 print:border-0 print:p-0 print:shadow-none">
        {showHeader ? (
          <header className="border-b border-slate-300 pb-3 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-900">
              {meta.facilityName || hospital.name}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-600">{hospital.address}</p>
            <p className="text-[10px] text-slate-600">
              Tel: {hospital.phone}
              {hospital.email ? `  ·  ${hospital.email}` : ""}
            </p>
          </header>
        ) : null}

        <div className="mt-4 border-b-2 border-slate-800 pb-3 text-center">
          <h1 className="text-base font-bold tracking-wide text-slate-900 uppercase">
            eClaims Batch Transmittal Receipt
          </h1>
          <p className="mt-1 text-[10px] text-slate-500">
            Hospital CMS acknowledgment of claims transmitted as one batch
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-slate-800">
          <MetaRow label="Facility" value={meta.facilityName || hospital.name} />
          <MetaRow label="Received Date" value={meta.receivedDate} />
          <MetaRow label="Receipt Ticket Number" value={meta.receiptTicketNumber} mono />
          <MetaRow label="Hospital Code" value={meta.hospitalCode} mono />
          <MetaRow label="Hospital Transmittal No." value={meta.hospitalTransmittalNo} mono />
          <MetaRow
            label="Transmission Control Number"
            value={meta.transmissionControlNumber}
            mono
          />
          <MetaRow label="Total Claims" value={String(meta.totalClaims)} />
          <MetaRow
            label="Generated"
            value={printedAt + (preparedBy ? `  ·  ${preparedBy}` : "")}
          />
        </div>

        <table className="mt-5 w-full border-collapse text-[9px] leading-tight">
          <thead>
            <tr className="bg-slate-800 text-left text-white">
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Claim Number</th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">
                Patient Last Name
              </th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">
                Patient First Name
              </th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">
                Patient Middle Name
              </th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Suffix</th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold whitespace-nowrap">
                Admission Date
              </th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold whitespace-nowrap">
                Discharge Date
              </th>
              <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">
                Claim Series LHIO
              </th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="border border-slate-300 px-2 py-6 text-center text-slate-500"
                >
                  No claims in this batch.
                </td>
              </tr>
            ) : (
              claims.map((claim, i) => {
                const patient = patientMap.get(claim.patientId);
                const bill = claim.billId ? billMap.get(claim.billId) : undefined;
                const dates = resolveClaimDates({ admissions }, claim, bill);
                const name = patientParts(patient);
                const zebra = i % 2 === 1;
                return (
                  <tr
                    key={claim.id}
                    className={zebra ? "bg-slate-50" : "bg-white"}
                    style={{ breakInside: "avoid" }}
                  >
                    <td className="border border-slate-300 px-1.5 py-1 font-mono">
                      {claim.id.replace(/^ECL-/i, "")}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 font-medium">
                      {name.lastName}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">{name.firstName}</td>
                    <td className="border border-slate-300 px-1.5 py-1">{name.middleName || "—"}</td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center">
                      {name.suffix || "—"}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 whitespace-nowrap">
                      {formatDisplayDate(dates.admissionDate)}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 whitespace-nowrap">
                      {formatDisplayDate(dates.dischargeDate)}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 font-mono">
                      {formatClaimSeriesLhio(claim.id)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-2 gap-10 text-[10px] text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">Prepared / Transmitted by</p>
            <div className="mt-10 border-b border-slate-400" />
            <p className="mt-1 text-slate-500">
              {preparedBy || "Signature over printed name"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Acknowledged by</p>
            <div className="mt-10 border-b border-slate-400" />
            <p className="mt-1 text-slate-500">Signature over printed name / date</p>
          </div>
        </div>

        <p className="mt-6 text-center text-[9px] text-slate-400">
          Internal Hospital CMS batch receipt — not an official PhilHealth ticket ·{" "}
          {hospital.name}
        </p>
      </section>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2 border-b border-slate-100 pb-1">
      <span className="w-44 shrink-0 font-semibold text-slate-600">{label}:</span>
      <span className={mono ? "font-mono tracking-wide text-slate-900" : "text-slate-900"}>
        {value || "—"}
      </span>
    </div>
  );
}
