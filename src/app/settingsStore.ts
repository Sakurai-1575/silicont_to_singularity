import { create } from "zustand";
import type { Language } from "../game/i18n";

/**
 * Player-facing UI preferences (Settings screen). Deliberately a SEPARATE
 * store and a separate localStorage key from useGameStore/utils/save.ts -
 * these are meta-preferences about how the app looks/behaves, not part of
 * GameState, so they must never be able to break save compatibility or
 * bleed into the Tick Engine.
 */
export type NumberFormatMode = "short" | "full";

export type Settings = {
  language: Language;
  numberFormat: NumberFormatMode;
  animationsEnabled: boolean;
  autoSaveEnabled: boolean;
  hasSeenTutorial: boolean;
};

type SettingsStore = Settings & {
  setLanguage: (language: Language) => void;
  setNumberFormat: (mode: NumberFormatMode) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  markTutorialSeen: () => void;
};

const SETTINGS_KEY = "silicon-to-singularity:settings";

const DEFAULT_SETTINGS: Settings = {
  language: "ja",
  numberFormat: "short",
  animationsEnabled: true,
  autoSaveEnabled: true,
  hasSeenTutorial: false,
};

function loadSettings(): Settings {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: Settings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Non-critical: quota errors here just mean the preference doesn't stick.
  }
}

function extractSettings(store: SettingsStore): Settings {
  return {
    language: store.language,
    numberFormat: store.numberFormat,
    animationsEnabled: store.animationsEnabled,
    autoSaveEnabled: store.autoSaveEnabled,
    hasSeenTutorial: store.hasSeenTutorial,
  };
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ...loadSettings(),

  setLanguage: (language) => {
    set({ language });
    persistSettings(extractSettings(get()));
  },
  setNumberFormat: (numberFormat) => {
    set({ numberFormat });
    persistSettings(extractSettings(get()));
  },
  setAnimationsEnabled: (animationsEnabled) => {
    set({ animationsEnabled });
    persistSettings(extractSettings(get()));
  },
  setAutoSaveEnabled: (autoSaveEnabled) => {
    set({ autoSaveEnabled });
    persistSettings(extractSettings(get()));
  },
  markTutorialSeen: () => {
    set({ hasSeenTutorial: true });
    persistSettings(extractSettings(get()));
  },
}));
