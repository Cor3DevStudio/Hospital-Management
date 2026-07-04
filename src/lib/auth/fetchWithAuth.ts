import { getSession } from "./authService";

/** Returns Authorization header for authenticated API requests. */
export function getAuthHeaders(): Record<string, string> {
  const session = getSession();
  if (!session?.token) return {};
  return { Authorization: `Bearer ${session.token}` };
}

/** fetch wrapper that attaches the session token when available. */
export async function fetchWithAuth(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  const auth = getAuthHeaders();
  for (const [key, value] of Object.entries(auth)) {
    headers.set(key, value);
  }
  return fetch(url, { ...init, headers });
}
