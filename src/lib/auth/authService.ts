import type {
  AuthSession,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserRole,
} from "./types";

const SESSION_KEY = "cms_auth_session";

/** localStorage key for the auth session (shared across browser tabs). */
export const AUTH_SESSION_STORAGE_KEY = SESSION_KEY;

export const AUTH_EXPIRED_EVENT = "cms:auth-expired";

let authExpiredNotified = false;

function readSessionRaw(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

function writeSessionRaw(value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, value);
}

/** One-time migration from tab-scoped sessionStorage to shared localStorage. */
export function migrateSessionFromSessionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const legacy = sessionStorage.getItem(SESSION_KEY);
    if (!legacy) return;
    if (!readSessionRaw()) writeSessionRaw(legacy);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage errors
  }
}

function parseSession(raw: string): AuthSession | null {
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function createClientSession(token: string, user: AuthSession["user"]): AuthSession {
  return {
    token,
    user,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  authExpiredNotified = false;
  writeSessionRaw(JSON.stringify(session));
}

/** Clears session and notifies listeners once (e.g. after 401). */
export function notifyAuthExpired(): void {
  if (typeof window === "undefined" || authExpiredNotified) return;
  authExpiredNotified = true;
  clearSession();
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

export function updateSessionPageAccess(pageAccess: string[] | null): void {
  const session = getSession();
  if (!session) return;
  saveSession({
    ...session,
    user: { ...session.user, pageAccess },
  });
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readSessionRaw();
    if (!raw) return null;
    const session = parseSession(raw);
    if (!session) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getSessionUsername(): string | null {
  return getSession()?.user?.username ?? null;
}

export function hasValidSession(): boolean {
  return Boolean(getSession()?.token);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

/**
 * Login via POST /api/auth/login (MariaDB-backed API).
 * UI depends only on LoginRequest / LoginResponse.
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const result = await postJson<LoginResponse>("/api/auth/login", request);

    if (result.success && result.token && result.user) {
      saveSession(createClientSession(result.token, result.user));
    }

    return result;
  } catch (error) {
    console.error("[authService.login]", error);
    return {
      success: false,
      message:
        "Unable to reach the server. Ensure the app is running and MariaDB is configured.",
    };
  }
}

export async function register(request: RegisterRequest): Promise<LoginResponse> {
  try {
    const result = await postJson<LoginResponse>("/api/auth/register", request);

    if (result.success && result.token && result.user) {
      saveSession(createClientSession(result.token, result.user));
    }

    return result;
  } catch (error) {
    console.error("[authService.register]", error);
    return {
      success: false,
      message:
        "Unable to reach the server. Ensure the app is running and MariaDB is configured.",
    };
  }
}

export function logout(): void {
  clearSession();
}
