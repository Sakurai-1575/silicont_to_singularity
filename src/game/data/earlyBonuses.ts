import type { GameState } from "../types/game";
import { BALANCE } from "./balance";

export type EarlyBonusId =
  | "first_model_bonus"
  | "first_deployment_bonus"
  | "research_grant"
  | "startup_accelerator_1"
  | "startup_accelerator_2";

export type EarlyBonusDefinition = {
  id: EarlyBonusId;
  /** Japanese Event Log message stem (see store/actions/*.ts's STAFF_ROLE_JA-style precedent for why raw Japanese lives in data/engine files, not i18n, for the log). Amount is appended by the caller. */
  logMessageJa: string;
  /** Resolved at grant time (not module-load time) so tuning BALANCE.* live-reloads correctly. */
  reward: () => number;
  isEligible: (state: GameState, completedObjectiveCount: number) => boolean;
};

/**
 * Early Game Milestone & Balance Sprint section 4: one-time, auto-granted
 * cash bonuses (as opposed to Prototype Contract / Data Cleaning Contract in
 * data/contracts.ts, which the player must click to claim). Checked every
 * tick by engine/tick.ts's Step 20 against `state.claimedBonusIds` - each id
 * can only ever grant once per playthrough. Modeled directly on
 * data/achievements.ts's isComplete-predicate shape, but deliberately kept
 * separate from the achievements system: these affect gameplay cash and
 * must be wiped on Reset Game (achievements are permanent, account-wide
 * meta-progress and live in a completely separate store).
 */
export const EARLY_BONUS_DEFINITIONS: EarlyBonusDefinition[] = [
  {
    id: "first_model_bonus",
    logMessageJa: "初めてモデルを完成させました: First Model Bonusを受け取りました",
    reward: () => BALANCE.firstModelBonus,
    isEligible: (s) => s.completedModels.length > 0,
  },
  {
    id: "first_deployment_bonus",
    logMessageJa: "初めてモデルをデプロイしました: First Deployment Bonusを受け取りました",
    reward: () => BALANCE.firstDeploymentBonus,
    isEligible: (s) => s.deployedModelIds.length > 0,
  },
  {
    id: "research_grant",
    logMessageJa: "研究体制が整いました: Research Grantを受け取りました",
    reward: () => BALANCE.researchGrantReward,
    isEligible: (s) => s.researchers > 0 || s.researchPoints >= 50,
  },
  {
    id: "startup_accelerator_1",
    logMessageJa: "序盤マイルストーンを一定数達成しました: Startup Accelerator Bonusを受け取りました",
    reward: () => BALANCE.startupMilestoneReward1,
    isEligible: (_s, completedObjectiveCount) => completedObjectiveCount >= BALANCE.startupMilestoneThreshold1,
  },
  {
    id: "startup_accelerator_2",
    logMessageJa: "序盤マイルストーンを多数達成しました: Startup Accelerator Bonus (2)を受け取りました",
    reward: () => BALANCE.startupMilestoneReward2,
    isEligible: (_s, completedObjectiveCount) => completedObjectiveCount >= BALANCE.startupMilestoneThreshold2,
  },
];
