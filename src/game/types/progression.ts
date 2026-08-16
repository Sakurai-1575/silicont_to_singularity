/**
 * Sprint 2 "Base View" domain types: visual progression stage, data
 * automation stage, and player-facing bottleneck flags. None of these are
 * persisted in GameState - they are all derived fresh from GameState by the
 * pure functions in src/game/engine/{progression,automation,bottlenecks}.ts,
 * the same way warnings/objectives already are.
 */
export type VisualStage =
  | "garage"
  | "small_office"
  | "server_room"
  | "data_center"
  | "hyperscale_campus"
  | "singularity_lab";

export type AutomationStage = "manual" | "data_engineer" | "pipeline" | "synthetic" | "autonomous";

export type AutomationInfo = {
  stage: AutomationStage;
  /** Nominal raw-data TB/s the current stage's staff/tech would produce (display only). */
  autoRawPerSecond: number;
  /** Nominal clean-data TB/s the current stage's staff/tech would produce (display only). */
  autoCleanPerSecond: number;
};

export type BottleneckId =
  | "power"
  | "cooling"
  | "data"
  | "vram"
  | "research_points"
  | "cash"
  | "inference_compute"
  | "training_compute";

export type BottleneckSeverity = "warning" | "critical";

export type Bottleneck = {
  id: BottleneckId;
  severity: BottleneckSeverity;
};
