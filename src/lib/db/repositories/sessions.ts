import { and, eq, gt } from "drizzle-orm";

import { getDb } from "../client";
import { authSessions } from "../schema";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function newId(): string {
  return crypto.randomUUID();
}

export async function createAuthSession(userId: string): Promise<string> {
  const db = getDb();
  const token = `sess_${crypto.randomUUID().replace(/-/g, "")}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(authSessions).values({
    id: newId(),
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function deleteAuthSession(token: string): Promise<void> {
  const db = getDb();
  await db.delete(authSessions).where(eq(authSessions.token, token));
}

export async function findValidSession(token: string): Promise<{ userId: string } | null> {
  const db = getDb();
  const rows = await db
    .select({ userId: authSessions.userId })
    .from(authSessions)
    .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}
