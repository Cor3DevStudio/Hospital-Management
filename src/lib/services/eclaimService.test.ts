import { describe, expect, it } from "vitest";

import { resolveClaimAdmission, resolveClaimDates } from "./eclaimService";
import type { Admission, AppState, Bill, EClaim } from "@/lib/store";

const admission: Admission = {
  id: "ADM-1",
  patientId: "P1",
  roomWard: "Ward 3-A",
  admissionDate: "2026-07-01",
  admissionType: "Elective",
  attendingDoctor: "Dr. Cruz",
  status: "Discharged",
  dischargeDate: "2026-07-05",
};

const bill: Bill = {
  id: "BILL-1",
  patientId: "P1",
  date: "2026-07-04",
  items: [{ description: "Room", category: "Room", qty: 1, unitPrice: 800, amount: 800, admissionId: "ADM-1" }],
  philhealthDeduction: 0,
  amountPaid: 0,
  status: "Unpaid",
  patientType: "In-Patient",
};

const claim: EClaim = {
  id: "ECL-1",
  patientId: "P1",
  billId: "BILL-1",
  admissionDate: "2026-07-04",
  claimStatus: "Pending",
  philhealthStatus: "Member",
  createdAt: "2026-07-06T00:00:00.000Z",
  updatedAt: "2026-07-06T00:00:00.000Z",
};

const state = { admissions: [admission] } as Pick<AppState, "admissions">;

describe("resolveClaimAdmission", () => {
  it("links claim to admission via bill line item", () => {
    expect(resolveClaimAdmission(state, claim, bill)?.id).toBe("ADM-1");
  });
});

describe("resolveClaimDates", () => {
  it("uses admission record dates instead of stale claim or empty bill discharge", () => {
    const billWithoutDischarge = { ...bill, dischargeDate: undefined };
    expect(resolveClaimDates(state, claim, billWithoutDischarge)).toEqual({
      admissionDate: "2026-07-01",
      dischargeDate: "2026-07-05",
      roomWard: "Ward 3-A",
    });
  });
});
