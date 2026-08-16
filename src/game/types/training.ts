/**
 * AI model / training domain types.
 * See requirements doc section 6.6, 11, 12, 13.
 * NOTE: full training-loop logic (progress/loss/explosion updates) is out of
 * scope for Phase 1-3 per the current implementation instructions; these
 * types exist so hardware/vram calculations that reference
 * activeTrainingJob / completedModels / deployedModelIds compile and behave
 * correctly, and so Phase 5-6 can be dropped in without reshaping state.
 */
/**
 * Progression Expansion Sprint (spec section 11, "モデル特化"): a coarse
 * gameplay tag, NOT a literal capability system. Chat favors subscription
 * revenue, Code favors API revenue, Agent favors Enterprise deals, Vision
 * favors special deals, Enterprise favors contract deals - see
 * engine/modelCategory.ts for where each multiplier is actually applied.
 */
export type ModelCategory = "chat" | "code" | "search" | "agent" | "vision" | "enterprise";

export type ModelSpec = {
  id: string;
  name: string;
  parameters: number;
  requiredCleanData: number;
  requiredCompute: number;
  baseTrainingSeconds: number;
  requiredVram: number;
  minLoss: number;
  unlockTechId?: string;
  /** Progression Expansion Sprint: see ModelCategory's doc comment. */
  category: ModelCategory;
};

export type LearningRateMode = "safe" | "normal" | "aggressive";

export type TrainingJob = {
  modelId: string;
  progress: number;
  currentLoss: number;
  learningRateMode: LearningRateMode;
  dataSufficiencyRatio: number;
  isPaused: boolean;
  cooldownSeconds: number;
  /**
   * Feature Completion Sprint: true once a Loss Explosion has occurred at
   * any point during THIS run. Carried onto the resulting CompletedModel on
   * completion so engine/clear.ts's AGI clear condition ("そのTraining Job中に
   * Loss Explosionが発生していない") can check it without needing separate
   * per-run history. A fresh run (re-starting training on the same model
   * after an explosion) always starts this back at false.
   */
  hadLossExplosion: boolean;
  /** startedAt gameTimeSeconds, used by trainingHistory (spec section 8). */
  startedAt: number;
};

export type CompletedModel = {
  id: string;
  specId: string;
  name: string;
  parameters: number;
  finalLoss: number;
  qualityScore: number;
  completedAt: number;
  deployedAt?: number;
  /** Whether the run that produced this model ever hit a Loss Explosion (see TrainingJob.hadLossExplosion). */
  hadLossExplosion: boolean;
};

/**
 * One row of training history (Feature Completion Sprint spec section 8).
 * Appended by engine/tick.ts whenever a training job finishes; the MVP never
 * exposes a way to abort a job mid-run, so `outcome` is always "completed"
 * for now - the field exists so a future "cancel training" action can record
 * "aborted" without a state-shape change.
 */
export type TrainingHistoryEntry = {
  id: string;
  modelId: string;
  startedAt: number;
  completedAt: number;
  finalLoss: number;
  learningRateMode: LearningRateMode;
  dataSufficiencyRatio: number;
  hadLossExplosion: boolean;
  outcome: "completed" | "aborted";
};

/** Cap on retained training history rows, mirroring EVENT_LOG_LIMIT's role for the event log. */
export const TRAINING_HISTORY_LIMIT = 50;

export type TrainingState = {
  activeTrainingJob: TrainingJob | null;
  completedModels: CompletedModel[];
  /** Phase 3 "AI Product Portfolio": now supports multiple simultaneous entries (was capped at 1 in the pre-Phase-3 MVP) - see store/actions/deployModel.ts + engine/portfolio.ts's getMaxDeployedModels for the actual cap, which scales with facility/tech. */
  deployedModelIds: string[];
  trainingHistory: TrainingHistoryEntry[];
  /**
   * Phase 3: highest `deployedModelIds.length` ever observed in this
   * playthrough, mirrors the existing maxTotalComputeReached (types/hardware.ts)
   * / maxSecondsInDebtReached (types/finance.ts) "peak, even if it later
   * regresses" pattern - needed so a "ran 2+ models at once" Objective/
   * achievement stays true even after the player undeploys back down to 1.
   */
  maxDeployedModelsReached: number;
};

export const LEARNING_RATE_MODES: Record<
  LearningRateMode,
  { speedMultiplier: number; explosionChancePerTick: number }
> = {
  safe: { speedMultiplier: 0.7, explosionChancePerTick: 0 },
  normal: { speedMultiplier: 1.0, explosionChancePerTick: 0.0005 },
  aggressive: { speedMultiplier: 2.0, explosionChancePerTick: 0.004 },
};
