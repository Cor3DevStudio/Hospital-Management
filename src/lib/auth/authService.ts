import type {
  AuthSession,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserRole,
} from "./types";

const SESSION_KEY = "cms_auth_session";

function createClientSession(token: string, user: AuthSession["user"]): AuthSession {
  return {
    token,
    user,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

/** Clears leftover mock/real auth tokens so each app load requires a fresh sign-in. */
export function clearAuthOnStartup(): void {
  clearSession();
  if (typeof window === "undefined") return;
  try {
    const key = "cms_state_v2";
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.authedUser) {
      parsed.authedUser = null;
      localStorage.setItem(key, JSON.stringify(parsed));
    }
  } catch {
    // ignore corrupt storage
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
