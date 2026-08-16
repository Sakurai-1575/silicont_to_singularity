import type { VisualStage } from "../types/progression";
import { SFX_PATHS, BGM_PATHS } from "./audioManifest";

/**
 * Audio foundation (Feature Completion Sprint section 16). Real playback
 * logic now (Sprint 1's version was a permanent no-op stub) - but every
 * design choice here optimizes for "the asset files themselves don't exist
 * yet and that must never crash or block anything":
 *   - playSound/playBgm wrap the actual Audio() calls in try/catch AND
 *     attach a .catch() to the returned play() Promise, since a 404 or an
 *     autoplay-policy rejection both surface as a rejected Promise, not a
 *     thrown exception.
 *   - See audioManifest.ts's doc comment for why paths point at
 *     public/audio/... rather than a src/assets/audio/... static import.
 *
 * Usage: call playSound("modelComplete") etc. from the relevant
 * store/actions/*.ts file, engine/tick.ts, or a component's click handler.
 * Call playBgm(visualStage) when the Base View's stage changes (or "title"
 * on the Title screen) to cross to that stage's loop - see
 * components/screens/{TitleScreen,GameScreen}.tsx for the hookup. No
 * separate "unlock audio" gesture handler is needed: every real flow through
 * this app (clicking New Game/Continue/a tab/etc.) is itself a user gesture,
 * and browsers treat any user gesture on the page as unlocking autoplay for
 * the rest of the session - the very first playBgm("title") call may be
 * silently rejected before that first click, which is fine since playBgm
 * doesn't retry on its own; the next stage change (or a page reload after
 * the gesture) picks it up normally.
 */
export type SoundEvent =
  | "buy"
  | "upgrade"
  | "hire"
  | "researchUnlock"
  | "trainingStart"
  | "modelComplete"
  | "deploy"
  | "funding"
  | "warning"
  | "lossExplosion"
  | "meltdown"
  | "save"
  | "tabSwitch"
  | "gameClear"
  | "achievement"
  | "uiHover"
  | "uiClick"
  | "dataClick"
  | "dataClean";

export type AudioSettings = {
  muted: boolean;
  /** 0..1 */
  bgmVolume: number;
  /** 0..1 */
  sfxVolume: number;
};

const SETTINGS_KEY = "silicon-to-singularity:audio-settings";

function loadSettings(): AudioSettings {
  const fallback: AudioSettings = { muted: false, bgmVolume: 0.5, sfxVolume: 0.6 };
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function persistSettings(s: AudioSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Non-critical: quota errors just mean the preference doesn't stick.
  }
}

let settings: AudioSettings = loadSettings();
let currentBgm: HTMLAudioElement | null = null;
let currentBgmKey: VisualStage | "title" | null = null;

function isAudioAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.Audio !== "undefined";
}

/** These are USER PREFERENCES (like app/settingsStore.ts), not save data - deliberately kept in their own localStorage key so they never touch GameState/SaveData. */
export function setAudioSettings(next: Partial<AudioSettings>): void {
  settings = { ...settings, ...next };
  persistSettings(settings);
  if (currentBgm) {
    currentBgm.volume = settings.bgmVolume;
    if (settings.muted) {
      currentBgm.pause();
    } else {
      currentBgm.play().catch(() => {
        // Autoplay blocked (no user gesture yet) or file missing - harmless.
      });
    }
  }
}

export function getAudioSettings(): AudioSettings {
  return settings;
}

/**
 * Play a one-shot sound effect for the given game event. Safe to call
 * unconditionally from any layer (actions, engine-adjacent components,
 * UI handlers); never throws, and does nothing if muted or if the browser
 * has no Audio() support (e.g. during a headless render/typecheck).
 */
export function playSound(event: SoundEvent): void {
  if (!isAudioAvailable() || settings.muted) return;
  const path = SFX_PATHS[event];
  if (!path) return;
  try {
    const audio = new Audio(path);
    audio.volume = settings.sfxVolume;
    audio.play().catch(() => {
      // Missing file (404) or autoplay-blocked - not a real error, ignore.
    });
  } catch {
    // Never let an audio failure break gameplay.
  }
}

/**
 * Cross to the BGM track for the given Base View visual stage (or "title"
 * for the Title screen). A no-op if that track is already playing. Always
 * stops whatever was playing first, even if the new track's file doesn't
 * exist yet, so silence rather than an overlapping old loop is the failure
 * mode for a not-yet-added track.
 */
export function playBgm(stageOrTitle: VisualStage | "title"): void {
  if (!isAudioAvailable()) return;
  if (currentBgmKey === stageOrTitle && currentBgm) return;
  stopBgm();
  currentBgmKey = stageOrTitle;
  if (settings.muted) return;
  const path = BGM_PATHS[stageOrTitle];
  if (!path) return;
  try {
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = settings.bgmVolume;
    audio.play().catch(() => {
      // Autoplay blocked until a user gesture, or file missing - harmless.
    });
    currentBgm = audio;
  } catch {
    currentBgm = null;
  }
}

export function stopBgm(): void {
  if (currentBgm) {
    currentBgm.pause();
    currentBgm.src = "";
  }
  currentBgm = null;
}
