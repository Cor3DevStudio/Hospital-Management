import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as fileStore from "./fileStore";
import { validateAttachmentFile } from "./attachmentValidation";
import * as authService from "./auth/authService";
import { InactivityHandler } from "@/components/InactivityHandler";
import { fetchAuthSessionData, updateUserDarkModeViaApi } from "./services/userService";
import { normalizeConsultations } from "./services/consultationService";
import { mergeDatabaseIntoState } from "./services/syncService";
import { pauseAutoSync, resumeAutoSync, scheduleAutoSync } from "./services/autoSyncService";
import type { UserRole } from "./auth/types";

// ---------- Types ----------
export type Patient = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  birthDate: string;
  gender: "Male" | "Female";
  civilStatus: "Single" | "Married" | "Widowed" | "Separated";
  contactNumber: string;
  email?: string;
  address: { street: string; barangay: string; city: string; province: string; zip?: string };
  emergencyContact: { name: string; phone: string; relationship?: string };
  philhealth: { memberNumber?: string; category?: string; memberType?: string };
  seniorCitizen: { flag: boolean; idNumber?: string };
  pwd: { flag: boolean; idNumber?: string };
  archived: boolean;
  createdAt: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  doctor: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  status: "Scheduled" | "Confirmed" | "Completed" | "Cancelled" | "No Show";
};

export type Consultation = {
  id: string;
  patientId: string;
  appointmentId?: string;
  doctor: string;
  date: string;
  chiefComplaint: string;
  diagnosis: string;
  notes: string;
  prescriptions: { medicine: string; dosage: string; instructions: string }[];
  status: "Seen" | "Pending";
  discharged: boolean;
  dischargeDate?: string;
};

export type InventoryCategory =
  | "Medicine"
  | "Supplies"
  | "Equipment"
  | "Laboratory"
  | "Radiology"
  | "Miscellaneous";

export type Medicine = {
  id: string;
  name: string;
  category: InventoryCategory | string;
  stock: number;
  unit: string;
  reorderLevel: number;
  unitPrice: number;
  priceEffectiveDate?: string;
  expiry: string;
  archived?: boolean;
  priceItemId?: string;
};

export type PriceCategory =
  | "Medicine"
  | "Supplies"
  | "Equipment"
  | "Laboratory"
  | "Procedure"
  | "Room Rate"
  | "Miscellaneous"
  | "Other";

export type EClaimPhilhealthStatus = "Member" | "Dependent" | "Not a Member";
export type EClaimStatus = "Pending" | "Submitted" | "Approved" | "Denied";

export type EClaim = {
  id: string;
  patientId: string;
  billId?: string;
  admissionDate: string;
  roomWard?: string;
  philhealthStatus: EClaimPhilhealthStatus;
  caseRateCode?: string;
  claimStatus: EClaimStatus;
  notes?: string;
  /** User edits to CF-2 fields (merged over auto-filled values). */
  cf2Overrides?: Record<string, string | boolean>;
  /** User edits to CF-4 fields (merged over auto-filled values). */
  cf4Overrides?: Record<string, string | boolean>;
  createdAt: string;
  updatedAt: string;
};

/** One continuous stay in a room/ward type (supports transfers). */
export type RoomStay = {
  id: string;
  /** PriceItem id (category "Room Rate"). */
  roomTypeId: string;
  /** Display label / bed (e.g. "Ward 3-A"). */
  roomWard: string;
  startDate: string;
  /** Set when transferred out or discharged. */
  endDate?: string;
};

export type Admission = {
  id: string;
  patientId: string;
  roomWard: string;
  /** Current room type (PriceItem id, category "Room Rate"). */
  roomTypeId?: string;
  /** Stay segments for room transfers; auto-charged on discharge. */
  roomStays?: RoomStay[];
  admissionDate: string;
  admissionType: "Emergency" | "Elective";
  attendingDoctor: string;
  status: "Admitted" | "Discharged" | "Pending" | "Transferred";
  dischargeDate?: string;
  notes?: string;
  erRecordId?: string;
};

export type ERDisposition = "Admitted" | "Discharged" | "Transferred" | "Released";

export type ERRecord = {
  id: string;
  patientId: string;
  triageLevel: "Red" | "Yellow" | "Green" | "Black";
  arrivalDate: string;
  arrivalTime: string;
  chiefComplaint: string;
  attendingDoctor: string;
  attendingNurse?: string;
  disposition?: ERDisposition;
  admissionId?: string;
  status: "In Triage" | "Under Treatment" | "Transferred" | "Released" | "Admitted";
  notes?: string;
};

export type OPDRecord = {
  id: string;
  patientId: string;
  doctor: string;
  visitDate: string;
  serviceType: string;
  reasonForVisit?: string;
  diagnosis?: string;
  followUpDate?: string;
  consultationId?: string;
  status: "Open" | "Closed" | "Cancelled";
  notes?: string;
};

export type PharmacyRecord = {
  id: string;
  patientId: string;
  medicine: string;
  medicineId?: string;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  dispenseDate: string;
  prescribedBy: string;
  admissionId?: string;
  billId?: string;
  status: "Pending" | "Dispensed" | "Returned";
  notes?: string;
};

export type MiscellaneousRecord = {
  id: string;
  patientId: string;
  /** PriceItem id (category "Miscellaneous"). */
  feeTypeId: string;
  feeName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  chargeDate: string;
  orderedBy?: string;
  admissionId?: string;
  billId?: string;
  status: "Posted" | "Cancelled";
  notes?: string;
};

export type SuppliesRecord = {
  id: string;
  patientId: string;
  itemName: string;
  medicineId?: string;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  issueDate: string;
  issuedBy?: string;
  admissionId?: string;
  billId?: string;
  status: "Pending" | "Issued" | "Returned";
  notes?: string;
};

export type LaboratoryRecord = {
  id: string;
  patientId: string;
  testName: string;
  priceItemId?: string;
  billId?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  requestedBy: string;
  requestDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  resultDate?: string;
  resultValue?: string;
  resultSummary?: string;
  notes?: string;
};

export type RadiologyRecord = {
  id: string;
  patientId: string;
  imagingType: string;
  examType?: string;
  priceItemId?: string;
  billId?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  requestedBy: string;
  requestDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  reportDate?: string;
  findings?: string;
  notes?: string;
};

export type CashierTransaction = {
  id: string;
  patientId: string;
  billId?: string;
  transactionDate: string;
  amount: number;
  balanceRemaining?: number;
  paymentMethod: "Cash" | "Card" | "GCash" | "Insurance" | "Credit";
  status: "Paid" | "Unpaid" | "Refunded";
  receiptNumber?: string;
  description?: string;
};

export type MedicalRecord = {
  id: string;
  patientId: string;
  recordType:
    | "Consultation"
    | "Lab Report"
    | "Imaging"
    | "Prescription"
    | "Discharge Summary"
    | "Referral"
    | "Other";
  createdDate: string;
  physician: string;
  summary: string;
  confidential: boolean;
  notes?: string;
};

/** Itemized charge line on a Statement of Account. */
export type BillItem = {
  description: string;
  /** Canonical category for SOA summary grouping. */
  category?: "Medicine" | "Supplies" | "Lab" | "Radiology" | "Room" | "PF" | "Other" | string;
  qty?: number;
  unitPrice?: number;
  amount: number;
  /** Date charged (YYYY-MM-DD). */
  effectiveDate?: string;
  priceItemId?: string;
  medicineId?: string;
  /** Auto Room & Board charge source. */
  source?: "manual" | "room-board-auto";
  /** Admission that generated an auto Room & Board line. */
  admissionId?: string;
};

export type Bill = {
  id: string;
  patientId: string;
  date: string;
  /** Individual charge lines — never a single lump total. */
  items: BillItem[];
  philhealthDeduction: number;
  amountPaid: number;
  status: "Unpaid" | "Partial" | "Paid";
  patientType: "In-Patient" | "Out-Patient" | "ER" | "OPD" | "Dialysis";
  eclaimStatus?: "Pending" | "Transmitted" | "Approved" | "Rejected";
  dischargeDate?: string;
  caseRateCode?: string;
  paymentMethod?: string;
  notes?: string;
};

export type PriceItem = {
  id: string;
  code: string;
  description: string;
  caseRate: number;
  category: PriceCategory | string;
  effectiveDate?: string;
};

export type PriceHistory = {
  id: string;
  itemType: "priceItem" | "medicine"; // type of item this history entry belongs to
  itemId: string; // PriceItem.id or Medicine.id
  amount: number;
  effectiveDate: string; // YYYY-MM-DD
  createdAt: string;
  note?: string;
};

export type CaseRate = {
  id: string;
  code: string;
  description: string;
  amount: number;
  // ISO date YYYY-MM-DD when this rate becomes effective. If omitted, treated as very old (always effective unless overridden).
  effectiveDate?: string;
  category: "Medical" | "Surgical" | string;
  /** Health facility fee (from previous philhealth_records). */
  healthFacilityFee?: number;
  /** Professional fee amount (from previous philhealth_records). */
  professionalFeeAmount?: number;
  hospitalSharePct?: number;
  professionalFeePct?: number;
  active?: boolean;
};

export type User = {
  id: string;
  username: string;
  fullName: string;
  role: "Administrator" | "Doctor" | "Receptionist" | "Cashier";
  active: boolean;
  /** Allowed app page paths. Administrators always have full access. */
  pageAccess?: string[];
  password?: string;
  preferences?: { darkMode?: boolean };
};

export type HospitalInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  philhealthAccreditation: string;
  tin: string;
};

// ---------- Storage helpers ----------
const KEY = "cms_state_v3";
const LEGACY_KEY = "cms_state_v2";
export type AppState = {
  authedUser: string | null;
  patients: Patient[];
  appointments: Appointment[];
  consultations: Consultation[];
  medicines: Medicine[];
  bills: Bill[];
  admissions: Admission[];
  erRecords: ERRecord[];
  opdRecords: OPDRecord[];
  pharmacyRecords: PharmacyRecord[];
  suppliesRecords: SuppliesRecord[];
  miscellaneousRecords: MiscellaneousRecord[];
  laboratoryRecords: LaboratoryRecord[];
  radiologyRecords: RadiologyRecord[];
  cashierTransactions: CashierTransaction[];
  medicalRecords: MedicalRecord[];
  prices: PriceItem[];
  priceHistories: PriceHistory[];
  users: User[];
  hospital: HospitalInfo;
  caseRates: CaseRate[];
  eClaims: EClaim[];
  attachments?: Attachment[];
  // inactivity timeout in minutes (0 = disabled)
  inactivityTimeoutMinutes?: number;
  // seconds before timeout to show warning dialog
  inactivityWarningSeconds?: number;
};

type State = AppState;

export type Attachment = {
  id: string; // same as key
  key: string; // lookup key in fileStore
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
  refType: "patient" | "admission" | "bill" | "eclaim";
  refId: string; // id of patient/admission/bill
};

const todayISO = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const uid = () => Math.random().toString(36).slice(2, 10);

/** Empty initial state â€” clinical/registry data is loaded from API/DB when connected. */
const defaultState: State = {
  authedUser: null,
  hospital: {
    name: "",
    address: "",
    phone: "",
    email: "",
    philhealthAccreditation: "",
    tin: "",
  },
  users: [],
  patients: [],
  appointments: [],
  consultations: [],
  medicines: [],
  bills: [],
  admissions: [],
  erRecords: [],
  opdRecords: [],
  pharmacyRecords: [],
  suppliesRecords: [],
  miscellaneousRecords: [],
  laboratoryRecords: [],
  radiologyRecords: [],
  cashierTransactions: [],
  medicalRecords: [],
  prices: [],
  priceHistories: [],
  caseRates: [],
  eClaims: [],
  attachments: [],
  inactivityTimeoutMinutes: 15,
  inactivityWarningSeconds: 60,
};

const seed = defaultState;

function coerceInactivityMinutes(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function normalizeLoadedState(parsed: Partial<State>): State {
  const users = Array.isArray(parsed.users)
    ? parsed.users.map((u: User) => {
        const { password: _pw, ...rest } = u;
        return rest;
      })
    : [];

  return {
    ...defaultState,
    ...parsed,
    authedUser: null,
    users,
    patients: Array.isArray(parsed.patients) ? parsed.patients : [],
    appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    consultations: normalizeConsultations(
      Array.isArray(parsed.consultations) ? parsed.consultations : []
    ),
    medicines: Array.isArray(parsed.medicines)
      ? parsed.medicines.map((m) => ({ ...m, unit: m.unit ?? "pcs" }))
      : [],
    bills: Array.isArray(parsed.bills) ? parsed.bills : [],
    admissions: Array.isArray(parsed.admissions) ? parsed.admissions : [],
    erRecords: Array.isArray(parsed.erRecords) ? parsed.erRecords : [],
    opdRecords: Array.isArray(parsed.opdRecords) ? parsed.opdRecords : [],
    pharmacyRecords: Array.isArray(parsed.pharmacyRecords) ? parsed.pharmacyRecords : [],
    suppliesRecords: Array.isArray(parsed.suppliesRecords) ? parsed.suppliesRecords : [],
    miscellaneousRecords: Array.isArray(parsed.miscellaneousRecords) ? parsed.miscellaneousRecords : [],
    laboratoryRecords: Array.isArray(parsed.laboratoryRecords) ? parsed.laboratoryRecords : [],
    radiologyRecords: Array.isArray(parsed.radiologyRecords) ? parsed.radiologyRecords : [],
    cashierTransactions: Array.isArray(parsed.cashierTransactions) ? parsed.cashierTransactions : [],
    medicalRecords: Array.isArray(parsed.medicalRecords) ? parsed.medicalRecords : [],
    prices: Array.isArray(parsed.prices) ? parsed.prices : [],
    priceHistories: Array.isArray(parsed.priceHistories) ? parsed.priceHistories : [],
    // Never hydrate the PhilHealth catalog into app state (lives in MariaDB only).
    caseRates: [],
    eClaims: Array.isArray(parsed.eClaims) ? parsed.eClaims : [],
    attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
    hospital:
      parsed.hospital && typeof parsed.hospital === "object"
        ? (() => {
            const hospital = { ...defaultState.hospital, ...parsed.hospital };
            // Legacy seed label ("Hospital SMS" / "Clinic SMS") → Hospital
            if (/^(hospital|clinic)\s*sms$/i.test(hospital.name.trim())) {
              hospital.name = "Hospital";
            }
            return hospital;
          })()
        : defaultState.hospital,
    inactivityTimeoutMinutes: coerceInactivityMinutes(
      parsed.inactivityTimeoutMinutes,
      defaultState.inactivityTimeoutMinutes ?? 15
    ),
    inactivityWarningSeconds: coerceInactivityMinutes(
      parsed.inactivityWarningSeconds,
      defaultState.inactivityWarningSeconds ?? 60
    ),
  };
}

function load(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<State>;
    const hadCatalog =
      Array.isArray(parsed.caseRates) && parsed.caseRates.length > 0;
    // Drop catalog before spreading into state (avoids holding 9k rows in memory).
    if (hadCatalog) parsed.caseRates = [];
    const state = normalizeLoadedState(parsed);
    // One-time purge: rewrite localStorage without the PhilHealth catalog.
    if (hadCatalog) save(state);
    return state;
  } catch {
    return defaultState;
  }
}
function save(s: State) {
  if (typeof window === "undefined") return;
  const toPersist: State = {
    ...s,
    authedUser: null,
    users: s.users.map(({ password: _p, ...user }) => user),
    // Exclude ~9k PhilHealth rates from localStorage — they live in MariaDB.
    caseRates: [],
  };
  localStorage.setItem(KEY, JSON.stringify(toPersist));
}

const SAVE_DEBOUNCE_MS = 500;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: State | null = null;

function saveDebounced(s: State) {
  if (typeof window === "undefined") return;
  pendingSave = s;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (pendingSave) {
      save(pendingSave);
      pendingSave = null;
    }
  }, SAVE_DEBOUNCE_MS);
}

function flushPendingSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (pendingSave) {
    save(pendingSave);
    pendingSave = null;
  }
}

/** Flush debounced localStorage persistence immediately (e.g. before DB sync). */
export function persistStoreNow(): void {
  flushPendingSave();
}

// ---------- Context ----------
type Ctx = {
  state: State;
  setState: (updater: (s: State) => State) => void;
  login: (u: string, p: string) => Promise<boolean>;
  register: (
    username: string,
    fullName: string,
    role: "Administrator" | "Doctor" | "Receptionist" | "Cashier",
    password?: string
  ) => Promise<boolean>;
  logout: () => void;
  resetAll: () => void;
  addAttachment: (refType: "patient" | "admission" | "bill" | "eclaim", refId: string, file: File) => Promise<Attachment>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  getAttachmentBlob: (key: string) => Promise<Blob | null>;
  setDarkMode: (val: boolean) => void;
  isDark: boolean;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, _setState] = useState<State>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
    authService.clearAuthOnStartup();
    const loaded = load();
    loaded.authedUser = null;
    _setState(loaded);
    setHydrated(true);
  }, []);

  const setState = (updater: (s: State) => State) => {
    _setState((prev) => {
      const next = updater(prev);
      saveDebounced(next);
      scheduleAutoSync(next);
      return next;
    });
  };

  const setStateWithoutSync = (updater: (s: State) => State) => {
    pauseAutoSync();
    _setState((prev) => {
      const next = updater(prev);
      saveDebounced(next);
      return next;
    });
    resumeAutoSync();
  };

  const login = async (username: string, password: string) => {
    const result = await authService.login({ username, password });
    if (result.success && result.user) {
      const authedUser = result.user!.username;
      const { users, clinicalPayload, clinicalUpdatedAt } = await fetchAuthSessionData();
      const preferDatabase = Boolean(clinicalUpdatedAt) || Boolean(clinicalPayload && clinicalPayload.patients.length > 0);
      setStateWithoutSync((s) =>
        mergeDatabaseIntoState({ ...s, authedUser, users }, clinicalPayload, { preferDatabase })
      );
      return true;
    }
    return false;
  };

  const register = async (
    username: string,
    fullName: string,
    role: "Administrator" | "Doctor" | "Receptionist" | "Cashier",
    password?: string
  ) => {
    if (!password) return false;

    const result = await authService.register({
      username,
      fullName,
      role,
      password,
    });

    if (result.success && result.user) {
      const authedUser = result.user!.username;
      const { users, clinicalPayload, clinicalUpdatedAt } = await fetchAuthSessionData();
      const preferDatabase = Boolean(clinicalUpdatedAt) || Boolean(clinicalPayload && clinicalPayload.patients.length > 0);
      setStateWithoutSync((s) =>
        mergeDatabaseIntoState({ ...s, authedUser, users }, clinicalPayload, { preferDatabase })
      );
      return true;
    }

    return false;
  };

  const logout = () => {
    flushPendingSave();
    authService.clearSession();
    setState((s) => ({ ...s, authedUser: null }));
  };
  const resetAll = () => {
    flushPendingSave();
    authService.clearSession();
    localStorage.removeItem(KEY);
    _setState(seed);
  };

  // Attachment helpers (store binary blobs in IndexedDB and metadata in app state)
  const addAttachment = async (refType: "patient" | "admission" | "bill" | "eclaim", refId: string, file: File) => {
    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const key = uid();
    await fileStore.saveFile(key, file, { filename: file.name, mime: file.type, size: file.size });
    const meta: Attachment = {
      id: key,
      key,
      filename: file.name,
      mime: file.type || "application/pdf",
      size: file.size || 0,
      createdAt: new Date().toISOString(),
      refType,
      refId,
    };
    setState((s) => ({ ...s, attachments: [...(s.attachments || []), meta] }));
    return meta;
  };

  const deleteAttachment = async (attachmentId: string) => {
    let fileKey: string | undefined;
    setState((prev) => {
      const att = prev.attachments?.find((a) => a.id === attachmentId);
      if (!att) return prev;
      fileKey = att.key;
      return { ...prev, attachments: (prev.attachments || []).filter((a) => a.id !== attachmentId) };
    });
    if (fileKey) await fileStore.deleteFile(fileKey);
  };

  const getAttachmentBlob = async (key: string) => {
    return await fileStore.getFile(key);
  };

  // Dark mode helpers
  const resolveDarkPref = (): boolean => {
    try {
      if (state.authedUser) {
        const u = state.users.find((x) => x.username === state.authedUser);
        if (u && u.preferences && typeof u.preferences.darkMode === 'boolean') return u.preferences.darkMode;
      }
      const local = localStorage.getItem('pref_dark');
      if (local !== null) return local === '1';
      // fallback to prefers-color-scheme
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  };

  const setDarkMode = (val: boolean) => {
    if (state.authedUser) {
      const current = state.users.find((u) => u.username === state.authedUser);
      setState((s) => ({
        ...s,
        users: s.users.map((u) => u.username === s.authedUser ? { ...u, preferences: { ...(u.preferences || {}), darkMode: val } } : u),
      }));
      if (current?.id) {
        void updateUserDarkModeViaApi(current.id, val);
      }
    } else {
      try { localStorage.setItem('pref_dark', val ? '1' : '0'); } catch {}
      // apply immediately
      if (val) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    }
  };

  const isDark = resolveDarkPref();

  // Apply theme class when preference or auth changes
  useEffect(() => {
    try {
      const dark = resolveDarkPref();
      if (dark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    } catch {}
  }, [state.authedUser, state.users]);

  if (!hydrated) return null;

  return (
    <StoreCtx.Provider value={{ state, setState, login, register, logout, resetAll, addAttachment, deleteAttachment, getAttachmentBlob, setDarkMode, isDark }}>
      {children}
      <InactivityHandler />
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export { uid, todayISO };
