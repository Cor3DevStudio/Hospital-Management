import { describe, expect, it } from "vitest";

import {
  filterEClaims,
  getClaimDeadlineFromDates,
  getClaimFilingDeadline,
  resolveClaimAdmission,
  resolveClaimDates,
} from "./eclaimService";
import type { Admission, AppState, Bill, EClaim } from "@/lib/store";

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

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
  items: [
    {
      description: "Room",
      category: "Room",
      qty: 1,
      unitPrice: 800,
      amount: 800,
      admissionId: "ADM-1",
    },
  ],
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

describe("filterEClaims", () => {
  const searchState = {
    patients: [{ id: "P1", firstName: "Jose", lastName: "Rizal" }],
    admissions: [],
    consultations: [],
    opdRecords: [],
    erRecords: [
      {
        id: "ER-1",
        patientId: "P1",
        triageLevel: "Yellow",
        arrivalDate: "2026-07-07",
        arrivalTime: "10:00",
        chiefComplaint: "chest pain",
        attendingDoctor: "Dr. Cruz",
        status: "Released",
      },
    ],
    bills: [],
    eClaims: [claim],
    caseRates: [
      { id: "CR-1", code: "90935", description: "Dialysis", amount: 2500, category: "Medical" },
    ],
  } as unknown as AppState;

  it("searches clinical history without throwing", () => {
    expect(() => filterEClaims(searchState, { query: "chest" })).not.toThrow();
    expect(filterEClaims(searchState, { query: "chest" })).toHaveLength(1);
  });

  it("matches case rate descriptions in search", () => {
    const dialysisClaim = { ...claim, caseRateCode: "90935" };
    const withDialysis = {
      ...searchState,
      eClaims: [dialysisClaim],
    } as AppState;
    expect(filterEClaims(withDialysis, { query: "dialysis" })).toHaveLength(1);
  });
});

describe("getClaimFilingDeadline", () => {
  it("returns 60 days after the base date, with days remaining counted from today", () => {
    const info = getClaimFilingDeadline(daysFromToday(-10));
    expect(info?.deadlineDate).toBe(daysFromToday(50));
    expect(info?.daysRemaining).toBe(50);
    expect(info?.isOverdue).toBe(false);
  });

  it("flags overdue claims once the 60-day window has passed", () => {
    const info = getClaimFilingDeadline(daysFromToday(-65));
    expect(info?.daysRemaining).toBe(-5);
    expect(info?.isOverdue).toBe(true);
  });

  it("returns undefined when there is no base date", () => {
    expect(getClaimFilingDeadline(undefined)).toBeUndefined();
    expect(getClaimFilingDeadline("")).toBeUndefined();
  });
});

describe("getClaimDeadlineFromDates", () => {
  it("prefers discharge date over admission date", () => {
    const info = getClaimDeadlineFromDates({
      admissionDate: daysFromToday(-70),
      dischargeDate: daysFromToday(-10),
    });
    expect(info?.daysRemaining).toBe(50);
  });

  it("falls back to admission date when discharge date is empty (still admitted)", () => {
    const info = getClaimDeadlineFromDates({ admissionDate: daysFromToday(-5), dischargeDate: "" });
    expect(info?.daysRemaining).toBe(55);
  });
});
