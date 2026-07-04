import { buildBillMap, buildPatientMap } from "@/lib/stateIndexes";
import { uid, type AppState, type Bill, type EClaim, type EClaimStatus, type Patient } from "@/lib/store";

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
  const admission = state.admissions
    .filter((a) => a.patientId === bill.patientId)
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))[0];

  const existing = (state.eClaims ?? []).find((c) => c.billId === bill.id);
  const claimStatus = mapBillEclaimStatus(bill.eclaimStatus);

  if (existing) {
    return updateEClaim(state, {
      ...existing,
      caseRateCode: bill.caseRateCode,
      admissionDate: admission?.admissionDate ?? bill.date,
      roomWard: admission?.roomWard,
      philhealthStatus: getPatientPhilhealthStatus(patient),
      claimStatus,
    });
  }

  return createEClaim(state, {
    patientId: bill.patientId,
    billId: bill.id,
    admissionDate: admission?.admissionDate ?? bill.date,
    roomWard: admission?.roomWard,
    philhealthStatus: getPatientPhilhealthStatus(patient),
    caseRateCode: bill.caseRateCode,
    claimStatus,
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

  return (state.eClaims ?? [])
    .filter((claim) => {
      const bill = claim.billId ? billMap.get(claim.billId) : undefined;
      const dischargeDate = bill?.dischargeDate ?? bill?.date ?? claim.admissionDate;

      if (filter.startDate && dischargeDate < filter.startDate) return false;
      if (filter.endDate && dischargeDate > filter.endDate) return false;
      if (filter.patientType && filter.patientType !== "All" && bill?.patientType !== filter.patientType)
        return false;
      if (filter.caseRateFilter === "90935" && claim.caseRateCode !== "90935") return false;
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
        if (!name.includes(q) && !claim.id.toLowerCase().includes(q)) return false;
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
