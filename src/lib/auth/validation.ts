export const MIN_PASSWORD_LENGTH = 6;

export type LoginFieldErrors = {
  username?: string;
  password?: string;
};

export function validateLoginForm(username: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    errors.username = "Username is required";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return errors;
}

export function isLoginFormValid(username: string, password: string): boolean {
  return Object.keys(validateLoginForm(username, password)).length === 0;
}
