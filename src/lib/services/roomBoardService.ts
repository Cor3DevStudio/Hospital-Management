import { getPriceAsOf } from "@/lib/priceService";
import { appendBillLineItem, createEmptyBill, type BillLineItem } from "@/lib/services/billingService";
import { createPriceItem } from "@/lib/services/priceListService";
import { uid, todayISO, type Admission, type AppState, type PriceItem, type RoomStay } from "@/lib/store";

export const DEFAULT_ROOM_TYPES: { code: string; description: string; dailyRate: number }[] = [
  { code: "RB-WARD", description: "Ward", dailyRate: 800 },
  { code: "RB-SEMI", description: "Semi-Private", dailyRate: 1500 },
  { code: "RB-PRIV", description: "Private", dailyRate: 2500 },
  { code: "RB-ICU", description: "ICU", dailyRate: 5000 },
];

/** Calendar days between two YYYY-MM-DD dates (end − start). */
export function calendarDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Billable days for a stay segment.
 * Rule: max(1, discharge/end − start) in calendar days.
 * Same-day admission/discharge (or transfer) = 1 day. Partial days count as full days.
 */
export function billableDays(startDate: string, endDate: string): number {
  return Math.max(1, calendarDaysBetween(startDate, endDate));
}

export function getRoomRateItems(state: AppState): PriceItem[] {
  return state.prices
    .filter((p) => p.category === "Room Rate")
    .sort((a, b) => a.description.localeCompare(b.description));
}

export function ensureDefaultRoomRates(state: AppState): AppState {
  const existing = getRoomRateItems(state);
  if (existing.length > 0) return state;
  let next = state;
  for (const room of DEFAULT_ROOM_TYPES) {
    next = createPriceItem(next, {
      code: room.code,
      description: room.description,
      caseRate: room.dailyRate,
      category: "Room Rate",
      effectiveDate: todayISO(),
    });
  }
  return next;
}

export function roomTypeLabel(state: AppState, roomTypeId?: string): string {
  if (!roomTypeId) return "Room";
  return state.prices.find((p) => p.id === roomTypeId)?.description ?? "Room";
}

export function normalizeAdmissionRooms(admission: Admission, state?: AppState): Admission {
  const roomTypeId = admission.roomTypeId ?? "";
  const fallbackWard =
    admission.roomWard ||
    (state ? roomTypeLabel(state, roomTypeId) : "") ||
    "Ward";
  let roomStays = admission.roomStays ?? [];
  if (roomStays.length === 0 && (roomTypeId || admission.roomWard)) {
    roomStays = [
      {
        id: uid(),
        roomTypeId,
        roomWard: admission.roomWard || fallbackWard,
        startDate: admission.admissionDate,
        endDate: admission.dischargeDate,
      },
    ];
  }
  return {
    ...admission,
    roomTypeId: roomTypeId || roomStays[roomStays.length - 1]?.roomTypeId,
    roomWard: admission.roomWard || roomStays[roomStays.length - 1]?.roomWard || fallbackWard,
    roomStays,
  };
}

export function buildInitialRoomStays(
  roomTypeId: string,
  roomWard: string,
  admissionDate: string,
  dischargeDate?: string
): RoomStay[] {
  return [
    {
      id: uid(),
      roomTypeId,
      roomWard,
      startDate: admissionDate,
      endDate: dischargeDate,
    },
  ];
}

export type RoomBoardChargeLine = BillLineItem & {
  source: "room-board-auto";
  admissionId: string;
};

export function computeRoomBoardCharges(
  state: AppState,
  admission: Admission
): RoomBoardChargeLine[] {
  const dischargeDate = admission.dischargeDate;
  if (!dischargeDate) return [];

  const normalized = normalizeAdmissionRooms(admission, state);
  const stays = [...(normalized.roomStays ?? [])];
  if (stays.length === 0) return [];

  // Close open last segment on discharge.
  const closed = stays.map((stay, index) => {
    if (index === stays.length - 1) {
      return { ...stay, endDate: stay.endDate || dischargeDate };
    }
    return {
      ...stay,
      endDate: stay.endDate || stays[index + 1]?.startDate || dischargeDate,
    };
  });

  const lines: RoomBoardChargeLine[] = [];
  for (const stay of closed) {
    if (!stay.roomTypeId || !stay.startDate || !stay.endDate) continue;
    const days = billableDays(stay.startDate, stay.endDate);
    const rate =
      getPriceAsOf(state, "priceItem", stay.roomTypeId, stay.startDate) ??
      state.prices.find((p) => p.id === stay.roomTypeId)?.caseRate ??
      0;
    if (rate <= 0) continue;
    const typeName = roomTypeLabel(state, stay.roomTypeId);
    const wardLabel =
      stay.roomWard && stay.roomWard !== typeName ? stay.roomWard : typeName;
    lines.push({
      description: `ROOM - ${wardLabel} (${days} day/s) (${rate.toFixed(2)})`,
      category: "Room",
      qty: days,
      unitPrice: rate,
      amount: days * rate,
      priceItemId: stay.roomTypeId,
      effectiveDate: stay.startDate,
      source: "room-board-auto",
      admissionId: admission.id,
    });
  }
  return lines;
}

export function isAutoRoomBoardItem(
  item: { source?: string; admissionId?: string; description?: string },
  admissionId: string
): boolean {
  if (item.source === "room-board-auto" && item.admissionId === admissionId) return true;
  const desc = item.description ?? "";
  return (
    (desc.startsWith("ROOM -") || desc.startsWith("Room & Board —")) &&
    item.admissionId === admissionId
  );
}

export function removeRoomBoardCharges(state: AppState, admissionId: string): AppState {
  return {
    ...state,
    bills: state.bills.map((bill) => {
      const items = bill.items.filter((item) => !isAutoRoomBoardItem(item, admissionId));
      if (items.length === bill.items.length) return bill;
      const stillHasAuto = items.some((i) => i.source === "room-board-auto");
      return {
        ...bill,
        items,
        dischargeDate: stillHasAuto ? bill.dischargeDate : undefined,
      };
    }),
  };
}

function getOrCreateInpatientBill(
  state: AppState,
  patientId: string,
  preferredBillId?: string
): { state: AppState; billId: string } {
  if (preferredBillId) {
    const preferred = state.bills.find((b) => b.id === preferredBillId);
    if (preferred) return { state, billId: preferred.id };
  }
  const open = state.bills.find(
    (b) =>
      b.patientId === patientId &&
      b.status !== "Paid" &&
      b.patientType === "In-Patient"
  );
  if (open) return { state, billId: open.id };
  const created = createEmptyBill(state, patientId, "In-Patient");
  return { state: created.state, billId: created.bill.id };
}

/** Remove prior auto lines for this admission, then post fresh Room & Board charges. */
export function applyRoomBoardCharges(
  state: AppState,
  admissionId: string,
  targetBillId?: string
): AppState {
  const admission = state.admissions.find((a) => a.id === admissionId);
  if (!admission?.dischargeDate) return state;

  let next = removeRoomBoardCharges(state, admissionId);
  const lines = computeRoomBoardCharges(next, admission);
  if (lines.length === 0) return next;

  const billRef = getOrCreateInpatientBill(next, admission.patientId, targetBillId);
  next = billRef.state;

  for (const line of lines) {
    next = appendBillLineItem(next, billRef.billId, line);
  }

  // Stamp bill discharge date for SOA context
  next = {
    ...next,
    bills: next.bills.map((b) =>
      b.id === billRef.billId ? { ...b, dischargeDate: admission.dischargeDate, patientType: "In-Patient" } : b
    ),
  };

  return next;
}

export function transferRoom(
  state: AppState,
  admissionId: string,
  input: { roomTypeId: string; roomWard: string; transferDate: string }
): AppState {
  const admission = state.admissions.find((a) => a.id === admissionId);
  if (!admission || admission.status === "Discharged") return state;

  const normalized = normalizeAdmissionRooms(admission, state);
  const stays = [...(normalized.roomStays ?? [])];
  const transferDate = input.transferDate || todayISO();

  if (stays.length > 0) {
    const last = stays[stays.length - 1];
    stays[stays.length - 1] = { ...last, endDate: transferDate };
  }

  stays.push({
    id: uid(),
    roomTypeId: input.roomTypeId,
    roomWard: input.roomWard || roomTypeLabel(state, input.roomTypeId),
    startDate: transferDate,
  });

  const updated: Admission = {
    ...normalized,
    roomTypeId: input.roomTypeId,
    roomWard: input.roomWard || roomTypeLabel(state, input.roomTypeId),
    roomStays: stays,
    status: admission.status === "Pending" ? "Admitted" : admission.status,
  };

  return {
    ...state,
    admissions: state.admissions.map((a) => (a.id === admissionId ? updated : a)),
  };
}
