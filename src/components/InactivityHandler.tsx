import { useEffect, useRef } from "react";
import { toast } from "sonner";

import * as authService from "@/lib/auth/authService";
import { useStore } from "@/lib/store";

/**
 * Logs the user out after N minutes without pointer/keyboard activity.
 * Settings apply immediately when `inactivityTimeoutMinutes` changes (0 = disabled).
 */
export function InactivityHandler() {
  const { state, logout } = useStore();
  const authedUser = state.authedUser;
  const timeoutMinutes = Number(state.inactivityTimeoutMinutes) || 0;
  const timeoutMs = Math.max(0, Math.round(timeoutMinutes * 60 * 1000));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(0);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const legacy = window as Window & {
      __inactivity_timer_ref?: { id: ReturnType<typeof setTimeout> | null };
      __inactivity_warn_ref?: { id: ReturnType<typeof setInterval> | null };
    };
    if (legacy.__inactivity_timer_ref?.id != null) {
      clearTimeout(legacy.__inactivity_timer_ref.id);
      legacy.__inactivity_timer_ref.id = null;
    }
    if (legacy.__inactivity_warn_ref?.id != null) {
      clearInterval(legacy.__inactivity_warn_ref.id);
      legacy.__inactivity_warn_ref.id = null;
    }

    const clearTimer = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    sessionRef.current += 1;
    const session = sessionRef.current;
    clearTimer();

    if (!authedUser || timeoutMs <= 0) {
      return () => {
        sessionRef.current += 1;
        clearTimer();
      };
    }

    const runAutoLogout = () => {
      if (session !== sessionRef.current) return;
      sessionRef.current += 1;
      clearTimer();
      try {
        logoutRef.current();
      } catch (error) {
        console.error("[InactivityHandler] logout failed:", error);
        try {
          authService.clearSession();
        } catch {
          // ignore secondary cleanup errors
        }
      }
      toast.message("You have been logged out due to inactivity.");
    };

    const armTimer = () => {
      if (session !== sessionRef.current) return;
      clearTimer();
      timerRef.current = setTimeout(runAutoLogout, timeoutMs);
    };

    armTimer();

    const onActivity = () => armTimer();
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    const onVis = () => {
      if (document.visibilityState === "visible") armTimer();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      sessionRef.current += 1;
      clearTimer();
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authedUser, timeoutMs]);

  return null;
}
