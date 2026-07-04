import { useCallback, useState } from "react";

import { useStore } from "@/lib/store";
import { fetchAuthSessionData } from "@/lib/services/userService";
import { mergeDatabaseIntoState } from "@/lib/services/syncService";

import * as authService from "./authService";
import type { LoginRequest, LoginResponse, RegisterRequest } from "./types";

export function useAuth() {
  const { state, setState } = useStore();
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    async (request: LoginRequest): Promise<LoginResponse> => {
      setIsLoading(true);
      try {
        const result = await authService.login(request);

        if (result.success && result.user) {
          const authedUser = result.user.username;
          const { users, clinicalPayload } = await fetchAuthSessionData();
          setState((current) =>
            mergeDatabaseIntoState({ ...current, authedUser, users }, clinicalPayload)
          );
        }

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [setState]
  );

  const register = useCallback(
    async (request: RegisterRequest): Promise<LoginResponse> => {
      setIsLoading(true);
      try {
        const result = await authService.register(request);

        if (result.success && result.user) {
          const authedUser = result.user.username;
          const { users, clinicalPayload } = await fetchAuthSessionData();
          setState((current) =>
            mergeDatabaseIntoState({ ...current, authedUser, users }, clinicalPayload)
          );
        }

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [setState]
  );

  const logout = useCallback(() => {
    authService.logout();
    setState((current) => ({ ...current, authedUser: null }));
  }, [setState]);

  return {
    login,
    register,
    logout,
    isLoading,
    session: authService.getSession(),
    user: state.authedUser,
  };
}
