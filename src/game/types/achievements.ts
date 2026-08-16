/**
 * Achievement system foundation (Feature Completion Sprint section 14).
 * Deliberately NOT part of GameState/SaveData - achievements are permanent,
 * account-wide progress that should survive New Game/Reset Game, so they're
 * persisted separately via app/achievementsStore.ts (mirrors how
 * app/settingsStore.ts keeps UI preferences out of the save file). This
 * keeps the structure ready to swap in a real platform (e.g. Steam)
 * achievements backend later without touching GameState at all.
 */
export type AchievementId =
  | "first_gpu"
  | "first_cooling"
  | "first_model"
  | "first_deployment"
  | "first_funding"
  | "first_enterprise_deal"
  | "survive_meltdown"
  | "reach_data_center"
  | "unlock_agi_theory"
  | "achieve_singularity"
  // Early Game Milestone & Balance Sprint additions (spec section 9) - tied
  // to the same early milestones the expanded objective list now tracks.
  | "first_data"
  | "first_clean_data"
  | "first_training"
  | "first_revenue"
  | "first_data_engineer"
  | "first_researcher"
  | "first_tech"
  | "first_contract";
