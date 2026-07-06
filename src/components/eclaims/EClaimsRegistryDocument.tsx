import type { Admission, Bill, EClaim, HospitalInfo, Patient } from "@/lib/store";
import { resolveClaimDates } from "@/lib/services/eclaimService";

export type EClaimsRegistryFilters = {
  startDate?: string;
  endDate?: string;
  patientType?: string;
  caseRateFilter?: string;
  claimStatus?: string;
  query?: string;
};

export type EClaimsRegistryDocumentProps = {
  hospital: HospitalInfo;
  pages: EClaim[][];
  patientMap: Map<string, Patient>;
  billMap: Map<string, Bill>;
  admissions: Admission[];
  filters: EClaimsRegistryFilters;
  stats: { total: number; pendingCount: number; submittedCount: number };
  preparedBy?: string;
  showHeader?: boolean;
};

function formatPatientName(patient: Patient | undefined): string {
  if (!patient) return "—";
  return `${patient.lastName}, ${patient.firstName}`.toUpperCase();
}

function filterSummary(filters: EClaimsRegistryFilters): string {
  const parts: string[] = [];
  if (filters.startDate || filters.endDate) {
    parts.push(
      `Discharge: ${filters.startDate || "…"} – ${filters.endDate || "…"}`
    );
  }
  if (filters.patientType && filters.patientType !== "All") {
    parts.push(`Type: ${filters.patientType}`);
  }
  if (filters.caseRateFilter && filters.caseRateFilter !== "All") {
    parts.push(`Case rate: ${filters.caseRateFilter}`);
  }
  if (filters.claimStatus && filters.claimStatus !== "All") {
    parts.push(`Status: ${filters.claimStatus}`);
  }
  if (filters.query?.trim()) {
    parts.push(`Search: “${filters.query.trim()}”`);
  }
  return parts.length > 0 ? parts.join("  ·  ") : "All claims (no filters)";
}

function statusTone(status: EClaim["claimStatus"]): string {
  if (status === "Approved") return "#166534";
  if (status === "Submitted") return "#1d4ed8";
  if (status === "Denied") return "#991b1b";
  return "#92400e";
}

export function EClaimsRegistryDocument({
  hospital,
  pages,
  patientMap,
  billMap,
  admissions,
  filters,
  stats,
  preparedBy,
  showHeader = true,
}: EClaimsRegistryDocumentProps) {
  const printedAt = new Date().toLocaleString();
  const totalPages = Math.max(pages.length, 1);

  if (pages.length === 0) {
    return (
      <div className="eclaims-doc eclaims-page bg-white text-black">
        <DocumentHeader hospital={hospital} showHeader={showHeader} />
        <p className="mt-8 text-center text-sm text-slate-500">No claims match the current filters.</p>
      </div>
    );
  }

  let rowOffset = 0;

  return (
    <div className="eclaims-doc space-y-0 bg-white text-black">
      {pages.map((page, pageIndex) => {
        const startNo = rowOffset + 1;
        rowOffset += page.length;
        return (
          <section
            key={pageIndex}
            className="eclaims-page mb-8 border border-slate-200 bg-white p-6 shadow-sm print:mb-0 print:border-0 print:p-0 print:shadow-none"
          >
            <DocumentHeader hospital={hospital} showHeader={showHeader} />

            <div className="mt-4 border-b-2 border-slate-800 pb-3 text-center">
              <h1 className="text-base font-bold tracking-wide text-slate-900 uppercase">
                PhilHealth eClaims Monitoring Registry
              </h1>
              <p className="mt-1 text-[11px] text-slate-600">{filterSummary(filters)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Generated {printedAt}
                {preparedBy ? `  ·  Prepared by ${preparedBy}` : ""}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-700">
              <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5">
                Total: <strong>{stats.total}</strong>
              </span>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900">
                Pending: <strong>{stats.pendingCount}</strong>
              </span>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-900">
                Submitted+: <strong>{stats.submittedCount}</strong>
              </span>
              <span className="ml-auto text-slate-500">
                Page {pageIndex + 1} of {totalPages}
                {page.length > 0 ? `  ·  Rows ${startNo}–${startNo + page.length - 1}` : ""}
              </span>
            </div>

            <table className="mt-3 w-full border-collapse text-[10px] leading-tight">
              <thead>
                <tr className="bg-slate-800 text-left text-white">
                  <th className="w-7 border border-slate-700 px-1.5 py-1.5 font-semibold">#</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Claim ID</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Patient</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Type</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Admission</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Discharged</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Room/Ward</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">PhilHealth</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Case Rate</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Bill</th>
                  <th className="border border-slate-700 px-1.5 py-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {page.map((claim, i) => {
                  const patient = patientMap.get(claim.patientId);
                  const bill = claim.billId ? billMap.get(claim.billId) : undefined;
                  const dates = resolveClaimDates({ admissions }, claim, bill);
                  const rowNo = startNo + i;
                  const zebra = i % 2 === 1;
                  return (
                    <tr
                      key={claim.id}
                      className={zebra ? "bg-slate-50" : "bg-white"}
                      style={{ breakInside: "avoid" }}
                    >
                      <td className="border border-slate-300 px-1.5 py-1 text-center text-slate-500">
                        {rowNo}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 font-mono text-[9px]">
                        {claim.id}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 font-medium">
                        {formatPatientName(patient)}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1">
                        {bill?.patientType ?? "—"}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 whitespace-nowrap">
                        {dates.admissionDate || "—"}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 whitespace-nowrap">
                        {dates.dischargeDate || "—"}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1">
                        {dates.roomWard || "—"}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1">
                        {claim.philhealthStatus}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 font-mono text-[9px]">
                        {claim.caseRateCode || "—"}
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 font-mono text-[9px]">
                        {claim.billId || "—"}
                      </td>
                      <td
                        className="border border-slate-300 px-1.5 py-1 font-semibold"
                        style={{ color: statusTone(claim.claimStatus) }}
                      >
                        {claim.claimStatus}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pageIndex === pages.length - 1 && (
              <div className="mt-6 grid grid-cols-2 gap-8 text-[10px] text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">Prepared by</p>
                  <div className="mt-8 border-b border-slate-400" />
                  <p className="mt-1 text-slate-500">{preparedBy || "Signature over printed name"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Reviewed by</p>
                  <div className="mt-8 border-b border-slate-400" />
                  <p className="mt-1 text-slate-500">Signature over printed name</p>
                </div>
              </div>
            )}

            <p className="mt-4 text-center text-[9px] text-slate-400">
              Confidential — for PhilHealth eClaims monitoring use only · {hospital.name}
            </p>
          </section>
        );
      })}
    </div>
  );
}

function DocumentHeader({
  hospital,
  showHeader,
}: {
  hospital: HospitalInfo;
  showHeader: boolean;
}) {
  if (!showHeader) return null;
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
