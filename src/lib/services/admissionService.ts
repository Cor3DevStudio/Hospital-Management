import {
  applyRoomBoardCharges,
  buildInitialRoomStays,
  normalizeAdmissionRooms,
  removeRoomBoardCharges,
  transferRoom as transferRoomStay,
} from "@/lib/services/roomBoardService";
import { uid, todayISO, type Admission, type AppState } from "@/lib/store";

export function getLatestAdmission(state: AppState, patientId: string): Admission | undefined {
  return state.admissions
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))[0];
}

export function getPatientAdmissions(state: AppState, patientId: string): Admission[] {
  return state.admissions
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate));
}

export type PatientAdmissionSummary = {
  admissions: Admission[];
  totalCount: number;
  /** Prior admissions, optionally excluding the record being edited. */
  priorCount: number;
  isReAdmission: boolean;
  isCurrentlyAdmitted: boolean;
  latestAdmission?: Admission;
};

export function getPatientAdmissionSummary(
  state: AppState,
  patientId: string,
  options?: { excludeAdmissionId?: string },
): PatientAdmissionSummary {
  const admissions = getPatientAdmissions(state, patientId);
  const prior = options?.excludeAdmissionId
    ? admissions.filter((a) => a.id !== options.excludeAdmissionId)
    : admissions;

  return {
    admissions,
    totalCount: admissions.length,
    priorCount: prior.length,
    isReAdmission: prior.length > 0,
    isCurrentlyAdmitted: isPatientAdmitted(state, patientId),
    latestAdmission: admissions[0],
  };
}

/** Count admissions per patient for search-result badges. */
export function buildAdmissionCountByPatient(state: AppState): Map<string, number> {
  const map = new Map<string, number>();
  for (const admission of state.admissions) {
    map.set(admission.patientId, (map.get(admission.patientId) ?? 0) + 1);
  }
  return map;
}

export function isPatientAdmitted(state: AppState, patientId: string): boolean {
  const latest = getLatestAdmission(state, patientId);
  return !!latest && latest.status === "Admitted" && !latest.dischargeDate;
}

export function isPatientDischarged(state: AppState, patientId: string): boolean {
  const latest = getLatestAdmission(state, patientId);
  return !!latest && (latest.status === "Discharged" || !!latest.dischargeDate);
}

export function getAdmissionStatusLabel(state: AppState, patientId: string): string {
  const latest = getLatestAdmission(state, patientId);
  if (!latest) return "Outpatient";
  if (latest.status === "Admitted" && !latest.dischargeDate) return "Admitted";
  if (latest.status === "Discharged" || latest.dischargeDate) return "Discharged";
  if (latest.status === "Transferred") return "Transferred";
  if (latest.status === "Pending") return "Pending Admission";
  return latest.status;
}

function withRoomDefaults(
  form: Omit<Admission, "id"> | Admission,
): Admission | Omit<Admission, "id"> {
  const roomTypeId = form.roomTypeId ?? "";
  const roomWard = form.roomWard || "";
  const roomStays =
    form.roomStays && form.roomStays.length > 0
      ? form.roomStays
      : roomTypeId || roomWard
        ? buildInitialRoomStays(roomTypeId, roomWard, form.admissionDate, form.dischargeDate)
        : [];
  return {
    ...form,
    roomTypeId: roomTypeId || roomStays[roomStays.length - 1]?.roomTypeId,
    roomWard: roomWard || roomStays[roomStays.length - 1]?.roomWard || "",
    roomStays,
  };
}

function syncRoomCharges(
  state: AppState,
  prev: Admission | undefined,
  nextAdmission: Admission,
): AppState {
  const isDischarged = nextAdmission.status === "Discharged" || !!nextAdmission.dischargeDate;
  const wasDischarged = !!prev && (prev.status === "Discharged" || !!prev.dischargeDate);

  if (isDischarged && nextAdmission.dischargeDate) {
    const normalized = normalizeAdmissionRooms(
      {
        ...nextAdmission,
        roomStays: (nextAdmission.roomStays ?? []).map((stay, index, arr) =>
          index === arr.length - 1 ? { ...stay, endDate: nextAdmission.dischargeDate } : stay,
        ),
      },
      state,
    );
    const next: AppState = {
      ...state,
      admissions: state.admissions.map((a) => (a.id === normalized.id ? normalized : a)),
    };
    return applyRoomBoardCharges(next, normalized.id);
  }

  if (wasDischarged && !isDischarged) {
    return removeRoomBoardCharges(state, nextAdmission.id);
  }

  return state;
}

export function createAdmission(state: AppState, form: Omit<Admission, "id">): AppState {
  const admission = {
    ...withRoomDefaults(form),
    id: uid(),
    status: form.status === "Pending" ? "Admitted" : form.status,
  } as Admission;
  let next: AppState = { ...state, admissions: [...state.admissions, admission] };
  next = syncRoomCharges(next, undefined, admission);
  return next;
}

export function updateAdmission(state: AppState, form: Admission): AppState {
  const prev = state.admissions.find((a) => a.id === form.id);
  const admission = withRoomDefaults(form) as Admission;

  // Keep the open stay segment aligned with current room fields (no new segment).
  let roomStays = [...(admission.roomStays ?? [])];
  if (roomStays.length > 0) {
    const last = roomStays[roomStays.length - 1];
    roomStays[roomStays.length - 1] = {
      ...last,
      roomTypeId: admission.roomTypeId || last.roomTypeId,
      roomWard: admission.roomWard || last.roomWard,
      endDate:
        admission.status === "Discharged" || admission.dischargeDate
          ? admission.dischargeDate || last.endDate
          : undefined,
    };
  }

  const nextAdmission: Admission = { ...admission, roomStays };
  let next: AppState = {
    ...state,
    admissions: state.admissions.map((a) => (a.id === nextAdmission.id ? nextAdmission : a)),
  };
  next = syncRoomCharges(next, prev, nextAdmission);
  return next;
}

export function deleteAdmission(state: AppState, admissionId: string): AppState {
  const next = removeRoomBoardCharges(state, admissionId);
  return {
    ...next,
    admissions: next.admissions.filter((a) => a.id !== admissionId),
  };
}

export function dischargePatient(
  state: AppState,
  admissionId: string,
  dischargeDate = todayISO(),
): AppState {
  const admission = state.admissions.find((a) => a.id === admissionId);
  if (!admission) return state;
  return updateAdmission(state, {
    ...admission,
    status: "Discharged",
    dischargeDate,
  });
}

export function cancelDischarge(state: AppState, admissionId: string): AppState {
  const admission = state.admissions.find((a) => a.id === admissionId);
  if (!admission) return state;
  const roomStays = (admission.roomStays ?? []).map((stay, index, arr) =>
    index === arr.length - 1 ? { ...stay, endDate: undefined } : stay,
  );
  return updateAdmission(state, {
    ...admission,
    status: "Admitted",
    dischargeDate: undefined,
    roomStays,
  });
}

export function transferRoom(
  state: AppState,
  admissionId: string,
  input: { roomTypeId: string; roomWard: string; transferDate: string },
): AppState {
  return transferRoomStay(state, admissionId, input);
}

export function emptyAdmission(patientId = ""): Admission {
  return {
    id: "",
    patientId,
    roomWard: "",
    roomTypeId: "",
    roomStays: [],
    admissionDate: todayISO(),
    admissionType: "Elective",
    attendingDoctor: "",
    status: "Admitted",
    notes: "",
  };
}
