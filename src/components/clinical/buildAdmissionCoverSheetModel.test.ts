import assert from "node:assert/strict";
import { buildAdmissionCoverSheetModel } from "./buildAdmissionCoverSheetModel";
import type { Admission } from "@/lib/store";

const admission: Admission = {
  id: "adm-188397",
  patientId: "p1",
  roomWard: "Room 208 / Bed 03",
  roomTypeId: "room-private",
  admissionDate: "2026-01-15",
  admissionType: "Elective",
  attendingDoctor: "Dr. Maria Santos",
  status: "Admitted",
  notes: "Hypertension, uncontrolled",
};

const model = buildAdmissionCoverSheetModel({
  admission,
  patient: {
    id: "p1",
    firstName: "John",
    middleName: "Santos",
    lastName: "Cruz",
    birthDate: "1976-06-15",
    gender: "Male",
    civilStatus: "Married",
    contactNumber: "09171234567",
    address: {
      street: "Manila",
      barangay: "",
      city: "Manila",
      province: "Philippines",
    },
    emergencyContact: { name: "Jane", phone: "09170000000" },
    philhealth: { memberNumber: "12-345678901-2", category: "Employed" },
    seniorCitizen: { flag: false },
    pwd: { flag: false },
    archived: false,
    createdAt: "2026-01-01",
  },
  hospital: {
    name: "Sample Medical Center",
    address: "Hospital Address, Manila City",
    phone: "(02) 123-4567",
    email: "",
    philhealthAccreditation: "0000435",
    tin: "",
  },
  state: { prices: [], priceHistories: [] } as never,
  preparedBy: "Admitting Clerk",
});

assert.equal(model.lastName, "CRUZ");
assert.equal(model.firstName, "JOHN");
assert.equal(model.hospitalNo.length, 15);
assert.equal(model.phicMemberNo, "12-345678901-2");
assert.equal(model.admissionDiagnosis, "Hypertension, uncontrolled");
assert.equal(model.admittingClerk, "Admitting Clerk");

console.log("buildAdmissionCoverSheetModel.test.ts: all assertions passed");
