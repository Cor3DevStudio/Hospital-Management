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
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
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

    const clearCheck = () => {
      if (checkRef.current != null) {
        clearInterval(checkRef.current);
        checkRef.current = null;
      }
    };

    sessionRef.current += 1;
    const session = sessionRef.current;
    clearCheck();

    if (!authedUser || timeoutMs <= 0) {
      return () => {
        sessionRef.current += 1;
        clearCheck();
      };
    }

    const markActivity = () => {
      if (session !== sessionRef.current) return;
      lastActivityAtRef.current = Date.now();
    };

    markActivity();

    const runAutoLogout = () => {
      if (session !== sessionRef.current) return;
      sessionRef.current += 1;
      clearCheck();
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

    checkRef.current = setInterval(() => {
      if (session !== sessionRef.current) return;
      if (Date.now() - lastActivityAtRef.current >= timeoutMs) {
        runAutoLogout();
      }
    }, 1000);

    const events = [
      "pointermove",
      "pointerdown",
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
      "focus",
    ] as const;
    for (const ev of events) {
      window.addEventListener(ev, markActivity, { passive: true, capture: true });
      document.addEventListener(ev, markActivity, { passive: true, capture: true });
    }
    const onVis = () => {
      if (document.visibilityState === "visible") markActivity();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      sessionRef.current += 1;
      clearCheck();
      for (const ev of events) {
        window.removeEventListener(ev, markActivity, { capture: true });
        document.removeEventListener(ev, markActivity, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authedUser, timeoutMs]);

  return null;
}
