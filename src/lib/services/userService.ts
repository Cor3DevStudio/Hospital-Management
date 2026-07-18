import type { ClinicalPayload } from "@/lib/types/clinicalPayload";
import type { UserRole } from "@/lib/auth/types";
import type { User } from "@/lib/store";

import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { loadAllFromDatabase } from "./syncService";

/** Fetches hospital users from the API (MariaDB-backed). */
export async function fetchUsers(): Promise<User[]> {
  try {
    const response = await fetchWithAuth("/api/users");
    if (!response.ok) return [];
    return (await response.json()) as User[];
  } catch {
    return [];
  }
}

/** Loads users and optional clinical payload after successful auth. */
export async function fetchAuthSessionData(): Promise<{
  users: User[];
  clinicalPayload: ClinicalPayload | null;
  clinicalUpdatedAt: string | null;
}> {
  const users = await fetchUsers();
  let clinicalPayload: ClinicalPayload | null = null;
  let clinicalUpdatedAt: string | null = null;
  try {
    const loaded = await loadAllFromDatabase();
    clinicalPayload = loaded.payload;
    clinicalUpdatedAt = loaded.updatedAt;
  } catch {
    // Database unavailable — continue with local data
  }
  return { users, clinicalPayload, clinicalUpdatedAt };
}

export function getActiveDoctors(users: User[]): User[] {
  return users.filter((u) => u.role === "Doctor" && Boolean(u.active));
}

/** Physicians available as ordering providers on lab/radiology orders. */
export function getOrderingProviders(users: User[]): User[] {
  return users
    .filter((u) => Boolean(u.active) && (u.role === "Doctor" || u.role === "Administrator"))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

type CreateUserBody = {
  username: string;
  fullName: string;
  role: UserRole;
  password: string;
};

export async function createUserViaApi(
  body: CreateUserBody,
): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const response = await fetchWithAuth("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { success: boolean; user?: User; message?: string };
    if (!response.ok) {
      return { success: false, message: result.message ?? "Failed to create user." };
    }
    return result;
  } catch {
    return { success: false, message: "Unable to reach the server." };
  }
}

export async function updateUserActiveViaApi(
  id: string,
  active: boolean,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetchWithAuth(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const result = (await response.json()) as { success: boolean; message?: string };
    if (!response.ok) {
      return { success: false, message: result.message ?? "Failed to update user." };
    }
    return result;
  } catch {
    return { success: false, message: "Unable to reach the server." };
  }
}

export async function updateUserPageAccessViaApi(
  id: string,
  pageAccess: string[],
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetchWithAuth(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageAccess }),
    });
    const result = (await response.json()) as { success: boolean; message?: string };
    if (!response.ok) {
      return { success: false, message: result.message ?? "Failed to update page access." };
    }
    return result;
  } catch {
    return { success: false, message: "Unable to reach the server." };
  }
}

export async function updateUserDarkModeViaApi(id: string, darkMode: boolean): Promise<void> {
  try {
    await fetchWithAuth(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode }),
    });
  } catch {
    // non-blocking preference sync
  }
}

export async function deleteUserViaApi(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetchWithAuth(`/api/users/${id}`, { method: "DELETE" });
    const result = (await response.json()) as { success: boolean; message?: string };
    if (!response.ok) {
      return { success: false, message: result.message ?? "Failed to delete user." };
    }
    return result;
  } catch {
    return { success: false, message: "Unable to reach the server." };
  }
}
