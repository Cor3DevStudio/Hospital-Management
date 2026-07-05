import { uid, todayISO, type Admission, type AppState, type Patient } from "@/lib/store";
import { getAdmissionStatusLabel } from "@/lib/services/admissionService";

export type PatientFilter = "active" | "archived" | "all";

export function computeAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}

export function getAdmissionStatus(patientId: string, admissions: Admission[]): string {
  return getAdmissionStatusLabel({ admissions } as AppState, patientId);
}

export function filterPatients(
  patients: Patient[],
  query: string,
  status: PatientFilter
): Patient[] {
  const q = query.trim().toLowerCase();
  return patients
    .filter((p) => {
      if (status === "active" && p.archived) return false;
      if (status === "archived" && !p.archived) return false;
      if (!q) return true;
      const name = `${p.firstName} ${p.middleName ?? ""} ${p.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.contactNumber.includes(q) ||
        (p.philhealth?.memberNumber ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}

export function isDuplicatePatient(patients: Patient[], form: Patient): boolean {
  return patients.some(
    (p) =>
      p.id !== form.id &&
      p.firstName.toLowerCase() === form.firstName.toLowerCase() &&
      p.lastName.toLowerCase() === form.lastName.toLowerCase()
  );
}

export function emptyPatient(): Patient {
  return {
    id: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    birthDate: "",
    gender: "Male",
    civilStatus: "Single",
    contactNumber: "",
    email: "",
    address: { street: "", barangay: "", city: "", province: "", zip: "" },
    emergencyContact: { name: "", phone: "", relationship: "" },
    philhealth: { memberNumber: "", category: "Employed", memberType: "Member" },
    seniorCitizen: { flag: false, idNumber: "" },
    pwd: { flag: false, idNumber: "" },
    archived: false,
    createdAt: todayISO(),
  };
}

function normalizePatientForm(form: Patient): Patient {
  const base = emptyPatient();
  return {
    ...base,
    ...form,
    address: { ...base.address, ...form.address },
    emergencyContact: { ...base.emergencyContact, ...form.emergencyContact },
    philhealth: { ...base.philhealth, ...form.philhealth },
    seniorCitizen: { ...base.seniorCitizen, ...form.seniorCitizen },
    pwd: { ...base.pwd, ...form.pwd },
  };
}

export function createPatient(
  state: AppState,
  form: Patient
): { state: AppState; patient: Patient } {
  const normalized = normalizePatientForm(form);
  const patient: Patient = {
    ...normalized,
    id: uid(),
    createdAt: new Date().toISOString(),
    archived: false,
  };
  return { state: { ...state, patients: [...state.patients, patient] }, patient };
}

export function updatePatient(state: AppState, form: Patient): AppState {
  return {
    ...state,
    patients: state.patients.map((p) => (p.id === form.id ? form : p)),
  };
}

export function archivePatient(state: AppState, patientId: string): AppState {
  return {
    ...state,
    patients: state.patients.map((p) => (p.id === patientId ? { ...p, archived: true } : p)),
  };
}

export function restorePatient(state: AppState, patientId: string): AppState {
  return {
    ...state,
    patients: state.patients.map((p) => (p.id === patientId ? { ...p, archived: false } : p)),
  };
}

export function deletePatient(state: AppState, patientId: string): AppState {
  return {
    ...state,
    patients: state.patients.filter((p) => p.id !== patientId),
    appointments: state.appointments.filter((a) => a.patientId !== patientId),
    consultations: state.consultations.filter((c) => c.patientId !== patientId),
    bills: state.bills.filter((b) => b.patientId !== patientId),
    admissions: state.admissions.filter((a) => a.patientId !== patientId),
  };
}

export function formatRegisteredDate(createdAt: string): string {
  if (!createdAt) return "—";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt.slice(0, 10);
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
