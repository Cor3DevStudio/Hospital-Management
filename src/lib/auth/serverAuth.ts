import type { LoginRequest, LoginResponse, UserRole } from "@/lib/auth/types";
import { verifyUserCredentials, createUser } from "@/lib/db/repositories/users";
import { createAuthSession } from "@/lib/db/repositories/sessions";

export async function loginWithDatabase(
  request: LoginRequest
): Promise<LoginResponse> {
  const verified = await verifyUserCredentials(request.username, request.password);
  if (!verified) {
    return { success: false, message: "Invalid username or password" };
  }

  const token = await createAuthSession(verified.id);

  const { id: _id, ...user } = verified;
  return {
    success: true,
    token,
    user,
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

  return {
    success: true,
    token,
    user,
  };
}
