import { getDb } from "@/lib/db/client";
import { findValidSession } from "@/lib/db/repositories/sessions";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AuthenticatedRequest = {
  userId: string;
  username: string;
};

const BEARER_PREFIX = "Bearer ";

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token || null;
}

export async function validateAuthToken(token: string): Promise<AuthenticatedRequest | null> {
  const session = await findValidSession(token);
  if (!session) return null;

  const db = getDb();
  const userRows = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const username = userRows[0]?.username;
  if (!username) return null;

  return { userId: session.userId, username };
}

export async function requireAuth(request: Request): Promise<AuthenticatedRequest | Response> {
  const token = extractBearerToken(request);
  if (!token) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const auth = await validateAuthToken(token);
  if (!auth) {
    return Response.json({ message: "Invalid or expired session." }, { status: 401 });
  }

  return auth;
}

export function isAuthError(result: AuthenticatedRequest | Response): result is Response {
  return result instanceof Response;
}
