import { buildBillMap, buildPatientMap } from "@/lib/stateIndexes";
import { getCaseRateByCode } from "@/lib/caseRateService";
import { uid, type Admission, type AppState, type Bill, type EClaim, type EClaimStatus, type Patient } from "@/lib/store";

export type EClaimFilter = {
  startDate?: string;
  endDate?: string;
  patientType?: string;
  caseRateFilter?: string;
  claimStatus?: string;
  query?: string;
};

export function getPatientPhilhealthStatus(patient: Patient | undefined): EClaim["philhealthStatus"] {
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
  bill?: Bill
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

/** Display dates from the patient admission record, with bill/claim fallbacks. */
export function resolveClaimDates(
  state: Pick<AppState, "admissions">,
  claim: EClaim,
  bill?: Bill
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
  input: Omit<EClaim, "id" | "createdAt" | "updatedAt">
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
      (a) => !(a.refType === "eclaim" && a.refId === claimId)
    ),
  };
}

export function updateEClaimStatus(state: AppState, claimId: string, status: EClaimStatus): AppState {
  const claim = (state.eClaims ?? []).find((c) => c.id === claimId);
  if (!claim) return state;
  return updateEClaim(state, { ...claim, claimStatus: status });
}

export function syncEClaimFromBill(state: AppState, bill: Bill): AppState {
  const patient = state.patients.find((p) => p.id === bill.patientId);
  const admission = resolveClaimAdmission(
    state,
    { patientId: bill.patientId, admissionDate: "" },
    bill
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

function mapBillEclaimStatus(
  status?: Bill["eclaimStatus"]
): EClaimStatus {
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
      .map((admission) => [admission.patientId, admission] as const)
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
    return [
      admission?.notes ?? "",
      admission?.roomWard ?? "",
      ...consultations,
      ...opd,
      ...er,
    ]
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
      if (filter.patientType && filter.patientType !== "All" && bill?.patientType !== filter.patientType)
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
        const name = patient
          ? `${patient.firstName} ${patient.lastName}`.toLowerCase()
          : "";
        const diagnosisBlob = searchBlobForPatient(claim.patientId);
        const caseRateDescription = claim.caseRateCode
          ? getCaseRateByCode(state, claim.caseRateCode)?.description ?? ""
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

export function getEClaimStats(claims: EClaim[]) {
  let pendingCount = 0;
  let submittedCount = 0;
  for (const c of claims) {
    if (c.claimStatus === "Pending") pendingCount += 1;
    else if (
      c.claimStatus === "Submitted" ||
      c.claimStatus === "Approved" ||
      c.claimStatus === "Denied"
    ) {
      submittedCount += 1;
    }
  }
  return { total: claims.length, pendingCount, submittedCount };
}

export function getClaimAttachments(state: AppState, claimId: string) {
  return (state.attachments ?? []).filter((a) => a.refType === "eclaim" && a.refId === claimId);
}
