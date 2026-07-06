import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

import type { AuthUser, UserRole } from "@/lib/auth/types";
import { ALL_PAGE_PATHS, getDefaultPageAccessForRole, normalizePageAccess, parsePageAccessJson } from "@/lib/pageAccess";
import type { User } from "@/lib/store";

import { getDb } from "../client";
import { users } from "../schema";

export type DbUserRow = typeof users.$inferSelect;

function toStoreUser(row: DbUserRow): User {
  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    role: row.role as User["role"],
    active: row.active,
    pageAccess:
      row.pageAccess == null
        ? getDefaultPageAccessForRole(row.role)
        : parsePageAccessJson(row.pageAccess),
    preferences: row.darkMode ? { darkMode: true } : undefined,
  };
}

function toAuthUser(row: DbUserRow): AuthUser {
  return {
    username: row.username,
    fullName: row.fullName,
    role: row.role as UserRole,
  };
}

export type VerifiedUser = AuthUser & { id: string };

export async function findUserByUsername(
  username: string
): Promise<DbUserRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.username}) = ${username.trim().toLowerCase()}`)
    .limit(1);

  return rows[0] ?? null;
}

export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<VerifiedUser | null> {
  const row = await findUserByUsername(username);
  if (!row || !row.active) return null;

  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) return null;

  return { ...toAuthUser(row), id: row.id };
}

export async function createUser(input: {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<AuthUser | null> {
  const existing = await findUserByUsername(input.username);
  if (existing) return null;

  const passwordHash = await bcrypt.hash(input.password, 10);
  const db = getDb();

  await db.insert(users).values({
    id: input.id,
    username: input.username,
    passwordHash,
    fullName: input.fullName,
    role: input.role,
    active: true,
    darkMode: false,
    pageAccess: getDefaultPageAccessForRole(input.role),
  });

  return {
    username: input.username,
    fullName: input.fullName,
    role: input.role,
  };
}

export async function usernameExists(username: string): Promise<boolean> {
  const row = await findUserByUsername(username);
  return row !== null;
}

export async function listActiveUsers(): Promise<AuthUser[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.active, true));

  return rows.map(toAuthUser);
}

export async function listUsersForStore(): Promise<User[]> {
  const db = getDb();
  const rows = await db.select().from(users);
  return rows.map(toStoreUser);
}

export async function updateUserActive(id: string, active: boolean): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.username.toLowerCase() === "admin") return false;

  await db.update(users).set({ active }).where(eq(users.id, id));
  return true;
}

export async function updateUserPageAccess(
  id: string,
  pageAccess: string[]
): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row) return false;

  // Administrators always retain full access
  if (row.role === "Administrator") {
    await db
      .update(users)
      .set({ pageAccess: [...ALL_PAGE_PATHS] })
      .where(eq(users.id, id));
    return true;
  }

  const normalized = normalizePageAccess(pageAccess);
  await db.update(users).set({ pageAccess: normalized }).where(eq(users.id, id));
  return true;
}

export async function updateUserDarkMode(id: string, darkMode: boolean): Promise<void> {
  const db = getDb();
  await db.update(users).set({ darkMode }).where(eq(users.id, id));
}

export async function deleteUserById(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.username.toLowerCase() === "admin") return false;

  await db.delete(users).where(eq(users.id, id));
  return true;
}

export async function createUserForStore(input: {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<User | null> {
  const created = await createUser({
    id: crypto.randomUUID(),
    username: input.username,
    password: input.password,
    fullName: input.fullName,
    role: input.role,
  });
  if (!created) return null;

  const row = await findUserByUsername(created.username);
  if (!row) return null;

  return toStoreUser(row);
}
