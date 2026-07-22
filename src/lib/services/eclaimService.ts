import { buildBillMap, buildPatientMap } from "@/lib/stateIndexes";
import { getCaseRateByCode } from "@/lib/caseRateService";
import {
  uid,
  type Admission,
  type AppState,
  type Bill,
  type EClaim,
  type EClaimStatus,
  type Patient,
} from "@/lib/store";

export type EClaimFilter = {
  startDate?: string;
  endDate?: string;
  patientType?: string;
  caseRateFilter?: string;
  claimStatus?: string;
  query?: string;
};

export function getPatientPhilhealthStatus(
  patient: Patient | undefined,
): EClaim["philhealthStatus"] {
  if (!patient?.philhealth?.memberNumber?.trim()) return "Not a Member";
  const type = patient.philhealth.memberType?.toLowerCase() ?? "";
  if (type.includes("dependent")) return "Dependent";
  return "Member";
}

function admissionIdFromBill(bill: Bill): string | undefined {
  for (const item of bill.items) {
    if (item.admissionId) return item.admissionId;
  }
  return undefined;
}

/** Admission record that best matches an eClaim (linked bill → patient stay). */
export function resolveClaimAdmission(
  state: Pick<AppState, "admissions">,
  claim: Pick<EClaim, "patientId" | "admissionDate">,
  bill?: Bill,
): Admission | undefined {
  const patientAdmissions = (state.admissions ?? []).filter((a) => a.patientId === claim.patientId);

  if (bill) {
    const linkedId = admissionIdFromBill(bill);
    if (linkedId) {
      const linked = patientAdmissions.find((a) => a.id === linkedId);
      if (linked) return linked;
    }
    if (bill.dischargeDate) {
      const byDischarge = patientAdmissions.find((a) => a.dischargeDate === bill.dischargeDate);
      if (byDischarge) return byDischarge;
    }
  }

  if (claim.admissionDate) {
    const exact = patientAdmissions.find((a) => a.admissionDate === claim.admissionDate);
    if (exact) return exact;
  }

  return patientAdmissions.sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))[0];
}

export type ResolvedClaimDates = {
  admissionDate: string;
  dischargeDate: string;
  roomWard?: string;
};

/** PhilHealth requires eClaims to be filed within 60 calendar days of discharge. */
export const PHILHEALTH_FILING_WINDOW_DAYS = 60;

export type ClaimDeadlineInfo = {
  /** Date (YYYY-MM-DD) the claim must be filed with PhilHealth by. */
  deadlineDate: string;
  /** Calendar days left until the deadline; negative once past due. */
  daysRemaining: number;
  isOverdue: boolean;
};

/** Parses a plain "YYYY-MM-DD" date string as a UTC calendar day (no local-timezone drift). */
function parseCalendarDateUTC(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return Date.UTC(y || 0, (m || 1) - 1, d || 1);
}

/**
 * PhilHealth filing deadline/days-remaining for a claim, counted from discharge date
 * (falls back to admission date for claims without a discharge date yet, e.g. still admitted).
 * Dates are treated as plain calendar days (UTC) to match how they're stored elsewhere
 * in the app (e.g. `todayISO`), avoiding off-by-one drift across timezones.
 */
export function getClaimFilingDeadline(
  baseDate: string | undefined,
): ClaimDeadlineInfo | undefined {
  if (!baseDate) return undefined;
  const baseMs = parseCalendarDateUTC(baseDate);
  if (Number.isNaN(baseMs)) return undefined;

  const deadlineMs = baseMs + PHILHEALTH_FILING_WINDOW_DAYS * 86400000;
  const todayMs = parseCalendarDateUTC(new Date().toISOString());
  const daysRemaining = Math.round((deadlineMs - todayMs) / 86400000);

  return {
    deadlineDate: new Date(deadlineMs).toISOString().slice(0, 10),
    daysRemaining,
    isOverdue: daysRemaining < 0,
  };
}

/** Convenience: resolve a claim's filing deadline from its resolved dates (discharge, else admission). */
export function getClaimDeadlineFromDates(
  dates: ResolvedClaimDates,
): ClaimDeadlineInfo | undefined {
  return getClaimFilingDeadline(dates.dischargeDate || dates.admissionDate);
}

/** Calculate days elapsed since admission or discharge. */
export function getClaimAgeDays(dates: ResolvedClaimDates): number | undefined {
  const baseDate = dates.dischargeDate || dates.admissionDate;
  if (!baseDate) return undefined;
  const baseMs = parseCalendarDateUTC(baseDate);
  const todayMs = parseCalendarDateUTC(new Date().toISOString());
  return Math.max(0, Math.round((todayMs - baseMs) / 86400000));
}

/** Display dates from the patient admission record, with bill/claim fallbacks. */
export function resolveClaimDates(
  state: Pick<AppState, "admissions">,
  claim: EClaim,
  bill?: Bill,
): ResolvedClaimDates {
  const admission = resolveClaimAdmission(state, claim, bill);
  return {
    admissionDate: admission?.admissionDate ?? claim.admissionDate ?? bill?.date ?? "",
    dischargeDate: admission?.dischargeDate ?? bill?.dischargeDate ?? "",
    roomWard: admission?.roomWard ?? claim.roomWard,
  };
}

export function createEClaim(
  state: AppState,
  input: Omit<EClaim, "id" | "createdAt" | "updatedAt">,
): AppState {
  const now = new Date().toISOString();
  const claim: EClaim = {
    ...input,
    id: `ECL-${uid().toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
  };
  return { ...state, eClaims: [...(state.eClaims ?? []), claim] };
}

export function updateEClaim(state: AppState, claim: EClaim): AppState {
  const updated = { ...claim, updatedAt: new Date().toISOString() };
  return {
    ...state,
    eClaims: (state.eClaims ?? []).map((c) => (c.id === claim.id ? updated : c)),
  };
}

export function deleteEClaim(state: AppState, claimId: string): AppState {
  return {
    ...state,
    eClaims: (state.eClaims ?? []).filter((c) => c.id !== claimId),
    attachments: (state.attachments ?? []).filter(
      (a) => !(a.refType === "eclaim" && a.refId === claimId),
    ),
  };
}

export function updateEClaimStatus(
  state: AppState,
  claimId: string,
  status: EClaimStatus,
): AppState {
  const claim = (state.eClaims ?? []).find((c) => c.id === claimId);
  if (!claim) return state;
  return updateEClaim(state, { ...claim, claimStatus: status });
}

/** Mark multiple pending eClaims as Submitted and sync linked bill eclaimStatus. */
export function transmitEClaimsBatch(state: AppState, claimIds: string[]): AppState {
  const idSet = new Set(claimIds);
  if (idSet.size === 0) return state;

  const now = new Date().toISOString();
  const billIds = new Set<string>();
  const eClaims = (state.eClaims ?? []).map((claim) => {
    if (!idSet.has(claim.id) || claim.claimStatus !== "Pending") return claim;
    if (claim.billId) billIds.add(claim.billId);
    return { ...claim, claimStatus: "Submitted" as const, updatedAt: now };
  });

  const bills =
    billIds.size === 0
      ? state.bills
      : state.bills.map((b) =>
          billIds.has(b.id) ? { ...b, eclaimStatus: "Transmitted" as const } : b,
        );

  return { ...state, eClaims, bills };
}

export type BatchTransmittalMeta = {
  facilityName: string;
  hospitalCode: string;
  receivedDate: string;
  receiptTicketNumber: string;
  hospitalTransmittalNo: string;
  transmissionControlNumber: string;
  totalClaims: number;
};

/** Build receipt/control numbers for a batch transmittal (CMS template, not PhilHealth official). */
export function buildBatchTransmittalMeta(
  hospital: Pick<AppState["hospital"], "name" | "philhealthAccreditation" | "tin">,
  claimCount: number,
  receivedAt: Date = new Date(),
): BatchTransmittalMeta {
  const y = receivedAt.getFullYear();
  const m = String(receivedAt.getMonth() + 1).padStart(2, "0");
  const d = String(receivedAt.getDate()).padStart(2, "0");
  const hh = String(receivedAt.getHours()).padStart(2, "0");
  const mm = String(receivedAt.getMinutes()).padStart(2, "0");
  const seq = uid().toUpperCase().slice(0, 4);
  const hospitalCode = (hospital.philhealthAccreditation || hospital.tin || "0000")
    .replace(/\D/g, "")
    .slice(0, 6)
    .padStart(4, "0");
  const codePrefix = hospitalCode.slice(0, 4);

  return {
    facilityName: hospital.name || "Hospital Facility",
    hospitalCode,
    receivedDate: `${m}-${d}-${y}`,
    receiptTicketNumber: `${m}${d}${String(y).slice(2)}${hh}${mm}${seq}`,
    hospitalTransmittalNo: `${y}${m}${d}${seq}`,
    transmissionControlNumber: `${codePrefix}-${m}${String(y).slice(2)}-${hh}${mm}-${seq}`,
    totalClaims: claimCount,
  };
}

/** Display claim series used on the batch receipt (derived from claim id). */
export function formatClaimSeriesLhio(claimId: string): string {
  const digits = claimId.replace(/\D/g, "");
  if (digits.length >= 15) return digits.slice(0, 15);
  const pad = uid().replace(/\D/g, "") || "0";
  return (digits + pad + "000000000000000").slice(0, 15);
}

export function syncEClaimFromBill(state: AppState, bill: Bill): AppState {
  const patient = state.patients.find((p) => p.id === bill.patientId);
  const admission = resolveClaimAdmission(
    state,
    { patientId: bill.patientId, admissionDate: "" },
    bill,
  );

  const existing = (state.eClaims ?? []).find((c) => c.billId === bill.id);
  const claimStatus = mapBillEclaimStatus(bill.eclaimStatus);
  const synced = {
    caseRateCode: bill.caseRateCode,
    admissionDate: admission?.admissionDate ?? bill.date,
    roomWard: admission?.roomWard,
    philhealthStatus: getPatientPhilhealthStatus(patient),
    claimStatus,
  };

  if (existing) {
    return updateEClaim(state, { ...existing, ...synced });
  }

  return createEClaim(state, {
    patientId: bill.patientId,
    billId: bill.id,
    ...synced,
    notes: bill.notes,
  });
}

function mapBillEclaimStatus(status?: Bill["eclaimStatus"]): EClaimStatus {
  switch (status) {
    case "Transmitted":
      return "Submitted";
    case "Approved":
      return "Approved";
    case "Rejected":
      return "Denied";
    default:
      return "Pending";
  }
}

export function filterEClaims(state: AppState, filter: EClaimFilter): EClaim[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  const billMap = buildBillMap(state.bills);
  const patientMap = buildPatientMap(state.patients);
  const admissionByPatient = new Map(
    state.admissions
      .slice()
      .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))
      .map((admission) => [admission.patientId, admission] as const),
  );

  const searchBlobForPatient = (patientId: string): string => {
    const admission = admissionByPatient.get(patientId);
    const consultations = (state.consultations ?? [])
      .filter((item) => item.patientId === patientId)
      .map((item) => `${item.chiefComplaint} ${item.diagnosis} ${item.notes}`);
    const opd = (state.opdRecords ?? [])
      .filter((item) => item.patientId === patientId)
      .map((item) => `${item.reasonForVisit ?? ""} ${item.diagnosis ?? ""} ${item.notes ?? ""}`);
    const er = (state.erRecords ?? [])
      .filter((item) => item.patientId === patientId)
      .map((item) => `${item.chiefComplaint ?? ""} ${item.notes ?? ""}`);
    return [admission?.notes ?? "", admission?.roomWard ?? "", ...consultations, ...opd, ...er]
      .join(" ")
      .toLowerCase();
  };

  return (state.eClaims ?? [])
    .filter((claim) => {
      const bill = claim.billId ? billMap.get(claim.billId) : undefined;
      const { dischargeDate } = resolveClaimDates(state, claim, bill);
      const filterDischarge = dischargeDate || bill?.date || claim.admissionDate;

      if (filter.startDate && filterDischarge < filter.startDate) return false;
      if (filter.endDate && filterDischarge > filter.endDate) return false;
      if (
        filter.patientType &&
        filter.patientType !== "All" &&
        bill?.patientType !== filter.patientType
      )
        return false;
      if (
        filter.caseRateFilter &&
        filter.caseRateFilter !== "All" &&
        (claim.caseRateCode ?? "").trim() !== filter.caseRateFilter
      ) {
        return false;
      }
      if (filter.claimStatus && filter.claimStatus !== "All") {
        if (filter.claimStatus === "Not Transmitted") {
          if (claim.claimStatus !== "Pending") return false;
        } else if (claim.claimStatus !== filter.claimStatus) {
          return false;
        }
      }
      if (q) {
        const patient = patientMap.get(claim.patientId);
        const name = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : "";
        const diagnosisBlob = searchBlobForPatient(claim.patientId);
        const caseRateDescription = claim.caseRateCode
          ? (getCaseRateByCode(state, claim.caseRateCode)?.description ?? "")
          : "";
        const claimBlob = [
          claim.id,
          claim.caseRateCode ?? "",
          caseRateDescription,
          claim.notes ?? "",
          bill?.notes ?? "",
          bill?.caseRateCode ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!name.includes(q) && !claimBlob.includes(q) && !diagnosisBlob.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getEClaimStats(state: Pick<AppState, "admissions" | "bills">, claims: EClaim[]) {
  const billMap = buildBillMap(state.bills ?? []);
  let pendingCount = 0;
  let submittedCount = 0;
  let nearDeadlineCount = 0;
  let overdueCount = 0;
  for (const c of claims) {
    if (c.claimStatus === "Pending") pendingCount += 1;
    else if (
      c.claimStatus === "Submitted" ||
      c.claimStatus === "Approved" ||
      c.claimStatus === "Denied"
    ) {
      submittedCount += 1;
    }
    // Filing-deadline risk only matters for claims that haven't been submitted yet.
    if (c.claimStatus === "Pending") {
      const bill = c.billId ? billMap.get(c.billId) : undefined;
      const dates = resolveClaimDates(state, c, bill);
      const deadline = getClaimDeadlineFromDates(dates);
      if (deadline?.isOverdue) overdueCount += 1;
      else if (deadline && deadline.daysRemaining <= 15) nearDeadlineCount += 1;
    }
  }
  return { total: claims.length, pendingCount, submittedCount, nearDeadlineCount, overdueCount };
}

export function getClaimAttachments(state: AppState, claimId: string) {
  return (state.attachments ?? []).filter((a) => a.refType === "eclaim" && a.refId === claimId);
}
