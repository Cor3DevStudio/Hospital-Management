import { uid, todayISO, type AppState, type Appointment } from "@/lib/store";

export const ACTIVE_APPOINTMENT_STATUSES: Appointment["status"][] = [
  "Scheduled",
  "Confirmed",
  "Completed",
];

export function getAllAppointments(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    return dateCmp !== 0 ? dateCmp : b.time.localeCompare(a.time);
  });
}

export function getAppointmentsForDate(appointments: Appointment[], date: string): Appointment[] {
  return appointments.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
}

export function getTodayAppointments(
  appointments: Appointment[],
  today = todayISO(),
): Appointment[] {
  return getAppointmentsForDate(appointments, today).filter((a) => a.status !== "Cancelled");
}

export function getUpcomingForPatient(
  appointments: Appointment[],
  patientId: string,
  fromDate = todayISO(),
): Appointment[] {
  return appointments
    .filter(
      (a) =>
        a.patientId === patientId &&
        a.date >= fromDate &&
        a.status !== "Cancelled" &&
        a.status !== "Completed",
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export function createAppointment(state: AppState, form: Omit<Appointment, "id">): AppState {
  const appointment: Appointment = { ...form, id: uid() };
  return { ...state, appointments: [...state.appointments, appointment] };
}

export function updateAppointment(state: AppState, form: Appointment): AppState {
  return {
    ...state,
    appointments: state.appointments.map((a) => (a.id === form.id ? form : a)),
  };
}

export function cancelAppointment(state: AppState, appointmentId: string): AppState {
  return {
    ...state,
    appointments: state.appointments.map((a) =>
      a.id === appointmentId ? { ...a, status: "Cancelled" as const } : a,
    ),
  };
}

export function deleteAppointment(state: AppState, appointmentId: string): AppState {
  return {
    ...state,
    appointments: state.appointments.filter((a) => a.id !== appointmentId),
    consultations: state.consultations.map((c) =>
      c.appointmentId === appointmentId ? { ...c, appointmentId: undefined } : c,
    ),
  };
}

export function patientName(patients: AppState["patients"], patientId: string): string {
  const p = patients.find((x) => x.id === patientId);
  return p ? `${p.lastName}, ${p.firstName}` : "—";
}
