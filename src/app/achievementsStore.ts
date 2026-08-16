import { create } from "zustand";
import type { AchievementId } from "../game/types/achievements";

/**
 * Persisted achievement unlock state (Feature Completion Sprint section 14).
 * Deliberately a SEPARATE store/localStorage key from useGameStore, mirroring
 * app/settingsStore.ts - achievements are permanent, account-wide progress
 * that must survive "New Game" / "Reset Game" (which wipe GameState) and, in
 * principle, could be shared across save slots. Keeping this out of
 * GameState/SaveData entirely also means the Steam-ready shape here
 * (a flat unlocked-id list + timestamps) never has to migrate in lockstep
 * with GameState's saveVersion.
 */
const ACHIEVEMENTS_KEY = "silicon-to-singularity:achievements";

export type UnlockedAchievement = {
  id: AchievementId;
  unlockedAt: number;
};

type AchievementsStore = {
  unlocked: UnlockedAchievement[];
  /** Unlocks `id` if not already unlocked. Returns true if this call newly unlocked it (so the caller can fire a toast), false if it was already unlocked. */
  unlock: (id: AchievementId, at: number) => boolean;
  isUnlocked: (id: AchievementId) => boolean;
};

function loadUnlocked(): UnlockedAchievement[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is UnlockedAchievement =>
        entry && typeof entry === "object" && typeof entry.id === "string" && typeof entry.unlockedAt === "number",
    );
  } catch {
    return [];
  }
}

function persistUnlocked(unlocked: UnlockedAchievement[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
  } catch {
    // Non-critical: quota errors here just mean the unlock doesn't persist.
  }
}

export const useAchievementsStore = create<AchievementsStore>()((set, get) => ({
  unlocked: loadUnlocked(),

  unlock: (id, at) => {
    if (get().unlocked.some((u) => u.id === id)) return false;
    const next = [...get().unlocked, { id, unlockedAt: at }];
    set({ unlocked: next });
    persistUnlocked(next);
    return true;
  },

  isUnlocked: (id) => get().unlocked.some((u) => u.id === id),
}));
