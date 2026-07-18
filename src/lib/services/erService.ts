import { createAdmission, emptyAdmission } from "@/lib/services/admissionService";
import { getRoomRateItems } from "@/lib/services/roomBoardService";
import { uid, todayISO, type AppState, type ERRecord } from "@/lib/store";

export function createERRecord(state: AppState, form: Omit<ERRecord, "id">): AppState {
  return { ...state, erRecords: [...state.erRecords, { ...form, id: uid() }] };
}

export function updateERRecord(state: AppState, form: ERRecord): AppState {
  return {
    ...state,
    erRecords: state.erRecords.map((r) => (r.id === form.id ? form : r)),
  };
}

export function deleteERRecord(state: AppState, recordId: string): AppState {
  return { ...state, erRecords: state.erRecords.filter((r) => r.id !== recordId) };
}

export function createAdmissionFromER(
  state: AppState,
  erRecordId: string,
  roomWard: string,
): { state: AppState; admissionId: string } | { error: string } {
  const er = state.erRecords.find((r) => r.id === erRecordId);
  if (!er) return { error: "ER record not found" };
  if (er.admissionId) return { error: "Admission already created for this ER visit" };

  const admissionForm = emptyAdmission(er.patientId);
  admissionForm.roomWard = roomWard;
  const roomRates = getRoomRateItems(state);
  const matched =
    roomRates.find((r) => r.description.toLowerCase() === roomWard.toLowerCase()) ||
    roomRates.find((r) => roomWard.toLowerCase().includes(r.description.toLowerCase())) ||
    roomRates[0];
  if (matched) admissionForm.roomTypeId = matched.id;
  admissionForm.admissionDate = er.arrivalDate || todayISO();
  admissionForm.admissionType = "Emergency";
  admissionForm.attendingDoctor = er.attendingDoctor;
  admissionForm.erRecordId = er.id;
  admissionForm.notes = er.chiefComplaint;

  let next = createAdmission(state, admissionForm);
  const admission = next.admissions[next.admissions.length - 1];

  next = updateERRecord(next, {
    ...er,
    status: "Admitted",
    disposition: "Admitted",
    admissionId: admission.id,
  });

  return { state: next, admissionId: admission.id };
}

export function emptyERRecord(patientId = ""): ERRecord {
  return {
    id: "",
    patientId,
    triageLevel: "Green",
    arrivalDate: todayISO(),
    arrivalTime: new Date().toTimeString().slice(0, 5),
    chiefComplaint: "",
    attendingDoctor: "",
    attendingNurse: "",
    status: "In Triage",
    notes: "",
  };
}
