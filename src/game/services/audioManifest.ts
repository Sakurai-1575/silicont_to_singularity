import type { VisualStage } from "../types/progression";
import type { SoundEvent } from "./audio";

/**
 * Asset path table (Feature Completion Sprint section 16). Paths point at
 * `public/audio/{bgm,sfx}/...` (served as-is by Vite from the project root,
 * NOT `src/assets/audio/...`) specifically so a missing file is just a
 * runtime 404 - audio.ts already treats that as a harmless no-op - rather
 * than a build-time failure. A static `import`/`url()` reference (like
 * index.css uses for the background images, which already existed on disk)
 * would make `npm run build` fail outright for every filename that doesn't
 * exist yet, which the spec explicitly requires NOT to happen. Drop files at
 * the exact paths below (project root: public/audio/bgm/*.mp3,
 * public/audio/sfx/*.wav) and they'll be picked up automatically - no code
 * change needed.
 */
const ASSET_BASE = import.meta.env.BASE_URL;

const SFX_BASE = `${ASSET_BASE}audio/sfx`;
const BGM_BASE = `${ASSET_BASE}audio/bgm`;

export const SFX_PATHS: Record<SoundEvent, string> = {
  buy: `${SFX_BASE}/buy.wav`,
  upgrade: `${SFX_BASE}/upgrade.wav`,
  hire: `${SFX_BASE}/hire.wav`,
  researchUnlock: `${SFX_BASE}/research-unlock.wav`,
  trainingStart: `${SFX_BASE}/training-start.wav`,
  modelComplete: `${SFX_BASE}/model-complete.wav`,
  deploy: `${SFX_BASE}/deploy.wav`,
  funding: `${SFX_BASE}/funding.wav`,
  warning: `${SFX_BASE}/warning.wav`,
  lossExplosion: `${SFX_BASE}/loss-explosion.wav`,
  meltdown: `${SFX_BASE}/meltdown.wav`,
  save: `${SFX_BASE}/save.wav`,
  tabSwitch: `${SFX_BASE}/tab-switch.wav`,
  gameClear: `${SFX_BASE}/game-clear.wav`,
  achievement: `${SFX_BASE}/achievement.wav`,
  uiHover: `${SFX_BASE}/ui-hover.wav`,
  uiClick: `${SFX_BASE}/ui-click.wav`,
  dataClick: `${SFX_BASE}/data-click.wav`,
  dataClean: `${SFX_BASE}/data-clean.wav`,
};

export const BGM_PATHS: Record<VisualStage | "title", string> = {
  title: `${BGM_BASE}/title-theme.mp3`,
  garage: `${BGM_BASE}/garage-loop.mp3`,
  small_office: `${BGM_BASE}/office-loop.mp3`,
  server_room: `${BGM_BASE}/server-room-loop.mp3`,
  data_center: `${BGM_BASE}/data-center-loop.mp3`,
  hyperscale_campus: `${BGM_BASE}/hyperscale-loop.mp3`,
  singularity_lab: `${BGM_BASE}/singularity-loop.mp3`,
};