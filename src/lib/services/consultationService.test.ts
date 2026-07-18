import { strict as assert } from "assert";

import {
  getAllConsultations,
  getConsultationsForPatient,
  mergeConsultationSources,
} from "./consultationService";
import type { Consultation, OPDRecord } from "../store";

const consultation = (overrides: Partial<Consultation> = {}): Consultation => ({
  id: "c1",
  patientId: "p1",
  doctor: "Dr. Cruz",
  date: "2026-07-01",
  chiefComplaint: "Fever",
  diagnosis: "URTI",
  notes: "",
  prescriptions: [],
  status: "Pending",
  discharged: false,
  ...overrides,
});

const opdRecord = (overrides: Partial<OPDRecord> = {}): OPDRecord => ({
  id: "opd1",
  patientId: "p2",
  doctor: "Dr. Santos",
  visitDate: "2026-07-02",
  serviceType: "Consultation",
  reasonForVisit: "Cough",
  diagnosis: "Bronchitis",
  status: "Open",
  ...overrides,
});

function run() {
  const merged = mergeConsultationSources(
    [consultation(), consultation({ id: "c2", patientId: "p2", date: "2026-07-03" })],
    [opdRecord()],
  );
  assert.equal(merged.length, 3);
  assert.equal(merged[0].date, "2026-07-03");

  const deduped = mergeConsultationSources(
    [consultation({ id: "linked" })],
    [opdRecord({ consultationId: "linked" })],
  );
  assert.equal(deduped.length, 1);

  const safeSort = getAllConsultations([
    consultation({ id: "bad", date: "" }),
    consultation({ id: "good", date: "2026-07-04" }),
  ]);
  assert.equal(safeSort.length, 2);

  const forPatient = getConsultationsForPatient([consultation({ patientId: "p1" })], "p1", [
    opdRecord({ patientId: "p2" }),
  ]);
  assert.equal(forPatient.length, 1);
  assert.equal(forPatient[0].patientId, "p1");

  const all = getAllConsultations([], [opdRecord()]);
  assert.equal(all.length, 1);
  assert.equal(all[0].patientId, "p2");
  assert.equal(all[0].chiefComplaint, "Cough");

  console.log("consultationService tests passed");
}

run();
