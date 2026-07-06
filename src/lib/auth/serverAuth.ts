import type { LoginRequest, LoginResponse, UserRole } from "@/lib/auth/types";
import { getDefaultPageAccessForRole, parsePageAccessJson } from "@/lib/pageAccess";
import {
  findUserByUsername,
  verifyUserCredentials,
  createUser,
} from "@/lib/db/repositories/users";
import { createAuthSession } from "@/lib/db/repositories/sessions";

function authUserFromRow(row: NonNullable<Awaited<ReturnType<typeof findUserByUsername>>>) {
  return {
    username: row.username,
    fullName: row.fullName,
    role: row.role as UserRole,
    pageAccess:
      row.pageAccess == null
        ? getDefaultPageAccessForRole(row.role)
        : parsePageAccessJson(row.pageAccess),
  };
}

export async function loginWithDatabase(
  request: LoginRequest
): Promise<LoginResponse> {
  const verified = await verifyUserCredentials(request.username, request.password);
  if (!verified) {
    return { success: false, message: "Invalid username or password" };
  }

  const row = await findUserByUsername(request.username);
  if (!row) {
    return { success: false, message: "Invalid username or password" };
  }

  const token = await createAuthSession(verified.id);

  return {
    success: true,
    token,
    user: authUserFromRow(row),
  };
}

export async function registerWithDatabase(input: {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<LoginResponse> {
  if (input.username.trim().toLowerCase() === "admin") {
    return { success: false, message: "Username already taken" };
  }

  const userId = crypto.randomUUID();
  const user = await createUser({
    id: userId,
    username: input.username.trim(),
    password: input.password,
    fullName: input.fullName.trim(),
    role: input.role,
  });

  if (!user) {
    return { success: false, message: "Username already taken" };
  }

  const token = await createAuthSession(userId);
  const row = await findUserByUsername(user.username);
  if (!row) {
    return { success: false, message: "Unable to complete registration." };
  }

  return {
    success: true,
    token,
    user: authUserFromRow(row),
  };
}
