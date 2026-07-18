import { strict as assert } from "assert";
import { createPatient, emptyPatient, isDuplicatePatient } from "./patientService";
import type { AppState } from "../store";

function baseState(): AppState {
  return {
    patients: [],
    bills: [],
    admissions: [],
    medicines: [],
    prices: [],
    users: [],
    hospital: { name: "Test Hospital", address: "Test City" },
    authedUser: "admin",
    cashierTransactions: [],
    eClaims: [],
    attachments: [],
    caseRates: [],
  } as unknown as AppState;
}

function run() {
  const form = {
    ...emptyPatient(),
    firstName: "Maria",
    lastName: "Santos",
    birthDate: "1995-05-10",
    contactNumber: "09171234567",
  };

  const created = createPatient(baseState(), form);
  assert.equal(created.state.patients.length, 1);
  assert(created.patient.id.length > 0, "Should assign patient id");
  assert.equal(created.patient.firstName, "Maria");
  assert.equal(created.patient.philhealth?.memberType, "Member");
  assert.equal(created.patient.address?.city, "");

  const duplicate = isDuplicatePatient(created.state.patients, {
    ...emptyPatient(),
    firstName: "maria",
    lastName: "santos",
  });
  assert(duplicate, "Should detect duplicate names case-insensitively");

  console.log("patientService tests passed");
}

run();

export {};
