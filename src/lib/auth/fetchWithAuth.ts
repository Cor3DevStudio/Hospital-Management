import { getSession, notifyAuthExpired } from "./authService";

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
  const session = getSession();
  if (!session?.token) {
    return new Response(JSON.stringify({ message: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);

  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    notifyAuthExpired();
  }
  return response;
}
