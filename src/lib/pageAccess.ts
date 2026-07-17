/** Navigable app pages — keep in sync with AppSidebar groups. */

export type PageGroup = "Main" | "Operations" | "Hospital Services" | "Administration";

export type AppPage = {
  path: string;
  title: string;
  group: PageGroup;
};

export const APP_PAGES: AppPage[] = [
  { path: "/dashboard", title: "Dashboard", group: "Main" },
  { path: "/patients", title: "Patients", group: "Main" },
  { path: "/appointments", title: "Appointments", group: "Main" },
  { path: "/inventory", title: "Inventory", group: "Operations" },
  { path: "/billing", title: "Billing", group: "Operations" },
  { path: "/philhealth", title: "PhilHealth", group: "Operations" },
  { path: "/eclaims-monitoring", title: "eClaims Monitoring", group: "Operations" },
  { path: "/pricelist", title: "PhilHealth Case Rates", group: "Operations" },
  { path: "/admission", title: "Admission", group: "Hospital Services" },
  { path: "/er", title: "Emergency Room", group: "Hospital Services" },
  { path: "/opd", title: "OPD", group: "Hospital Services" },
  { path: "/pharmacy", title: "Pharmacy", group: "Hospital Services" },
  { path: "/supplies", title: "Supplies", group: "Hospital Services" },
  { path: "/laboratory", title: "Laboratory", group: "Hospital Services" },
  { path: "/radiology", title: "Radiology", group: "Hospital Services" },
  { path: "/miscellaneous", title: "Miscellaneous", group: "Hospital Services" },
  { path: "/cashier", title: "Cashier", group: "Hospital Services" },
  { path: "/medical-records", title: "Medical Records", group: "Hospital Services" },
  { path: "/reports", title: "Reports", group: "Administration" },
  { path: "/settings", title: "Settings", group: "Administration" },
];

export const ALL_PAGE_PATHS = APP_PAGES.map((p) => p.path);

/** Default page access when creating users or when page_access is unset in DB. */
export const ROLE_DEFAULT_PAGE_ACCESS: Record<string, string[]> = {
  Administrator: [...ALL_PAGE_PATHS],
  Doctor: [...ALL_PAGE_PATHS],
  Receptionist: [
    "/dashboard",
    "/patients",
    "/appointments",
    "/admission",
    "/er",
    "/opd",
    "/pharmacy",
    "/supplies",
    "/laboratory",
    "/radiology",
    "/miscellaneous",
    "/medical-records",
  ],
  Cashier: ["/cashier", "/billing", "/patients", "/medical-records"],
};

export function getDefaultPageAccessForRole(role: string): string[] {
  return ROLE_DEFAULT_PAGE_ACCESS[role] ?? [...ALL_PAGE_PATHS];
}

export const PAGE_GROUPS: PageGroup[] = [
  "Main",
  "Operations",
  "Hospital Services",
  "Administration",
];

export type PageAccessUser = {
  role: string;
  pageAccess?: string[] | null;
};

/** Resolve the signed-in user for access checks (store record, then auth session). */
export function resolveAccessUser(
  state: { users: Array<{ username: string; role: string; pageAccess?: string[] | null }>; authedUser: string | null },
  sessionUser?: { username: string; role: string; pageAccess?: string[] | null } | null
): PageAccessUser | undefined {
  const username = state.authedUser?.trim();
  if (!username) return undefined;

  const fromStore = state.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (fromStore) {
    return { role: fromStore.role, pageAccess: fromStore.pageAccess };
  }

  if (sessionUser && sessionUser.username.toLowerCase() === username.toLowerCase()) {
    return { role: sessionUser.role, pageAccess: sessionUser.pageAccess };
  }

  return undefined;
}

/** Valid paths only; empty/missing means full access (legacy users). */
export function normalizePageAccess(paths: string[] | null | undefined): string[] {
  if (!paths || paths.length === 0) return [...ALL_PAGE_PATHS];
  const allowed = new Set(ALL_PAGE_PATHS);
  const next = paths.filter((p) => allowed.has(p));
  return next.length > 0 ? next : [...ALL_PAGE_PATHS];
}

export function userHasFullPageAccess(user: PageAccessUser | undefined): boolean {
  if (!user) return false;
  if (user.role === "Administrator") return true;
  const access = normalizePageAccess(user.pageAccess);
  return access.length >= ALL_PAGE_PATHS.length;
}

export function userCanAccessPage(
  user: PageAccessUser | undefined,
  pathname: string
): boolean {
  if (!user) return false;
  if (user.role === "Administrator") return true;
  const access = normalizePageAccess(user.pageAccess);
  return access.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function firstAllowedPage(user: PageAccessUser | undefined): string {
  if (!user || user.role === "Administrator") return "/dashboard";
  const access = normalizePageAccess(user.pageAccess);
  return access[0] ?? "/dashboard";
}

export function pageAccessSummary(user: PageAccessUser | undefined): string {
  if (!user) return "—";
  if (user.role === "Administrator" || userHasFullPageAccess(user)) return "All pages";
  const n = normalizePageAccess(user.pageAccess).length;
  return `${n} of ${ALL_PAGE_PATHS.length} pages`;
}

/**
 * Once closed/discharged, Admission, ER, and OPD records become read-only for everyone
 * except Administrators — protects historical clinical/billing data from accidental edits.
 * See client feedback item 5.
 */
export const RECORD_LOCK_EXEMPT_ROLE = "Administrator";

export function isAdmissionLocked(
  admission: { status?: string } | null | undefined,
  role: string | undefined
): boolean {
  if (!admission) return false;
  if (role === RECORD_LOCK_EXEMPT_ROLE) return false;
  return admission.status === "Discharged";
}

/** ER visit is locked once its disposition is finalized (no longer active in the ER). */
export function isERRecordLocked(
  record: { status?: string } | null | undefined,
  role: string | undefined
): boolean {
  if (!record) return false;
  if (role === RECORD_LOCK_EXEMPT_ROLE) return false;
  return record.status === "Released" || record.status === "Transferred" || record.status === "Admitted";
}

/** OPD consultation is locked once the patient has been seen/discharged. */
export function isConsultationLocked(
  consultation: { status?: string; discharged?: boolean } | null | undefined,
  role: string | undefined
): boolean {
  if (!consultation) return false;
  if (role === RECORD_LOCK_EXEMPT_ROLE) return false;
  return consultation.status === "Seen" || Boolean(consultation.discharged);
}

export function parsePageAccessJson(value: unknown): string[] {
  if (value == null) return [...ALL_PAGE_PATHS];
  if (Array.isArray(value)) return normalizePageAccess(value.map(String));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return normalizePageAccess(parsed.map(String));
    } catch {
      // ignore
    }
  }
  return [...ALL_PAGE_PATHS];
}
