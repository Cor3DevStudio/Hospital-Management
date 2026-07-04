export type UserRole = "Administrator" | "Doctor" | "Receptionist" | "Cashier";

export type AuthUser = {
  username: string;
  fullName: string;
  role: UserRole;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  expiresAt?: string;
};

export type RegisterRequest = {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
};
