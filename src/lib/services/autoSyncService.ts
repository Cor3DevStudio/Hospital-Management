import type { AppState } from "@/lib/store";

import { saveAllToDatabase } from "./syncService";

const DEBOUNCE_MS = 2000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingState: AppState | null = null;
let paused = false;

export function pauseAutoSync(): void {
  paused = true;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingState = null;
}

export function resumeAutoSync(): void {
  paused = false;
}

export function scheduleAutoSync(state: AppState): void {
  if (paused || !state.authedUser) return;

  pendingState = state;
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const toSave = pendingState;
    pendingState = null;
    if (!toSave?.authedUser || paused) return;

    void saveAllToDatabase(toSave).catch((error) => {
      console.warn("[autoSync] Failed to persist to database:", error);
    });
  }, DEBOUNCE_MS);
}
