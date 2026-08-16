import type { TechSpec } from "../types/tech";

/**
 * Requirements doc section 19.2. `category` + `treePosition` were added in
 * the Phase 2 "Real Tech Tree UI" sprint purely as display metadata for the
 * node-graph canvas (see types/tech.ts's doc comment) - every id, cost,
 * and prerequisite below is UNCHANGED from before that sprint, so existing
 * balance and existing saves (which only ever reference these by id
 * string) are unaffected.
 *
 * treePosition layout key (hand-placed, in world-space px, see
 * engine/techTreeLayout.ts): columns follow prerequisite depth
 * (x = 60 + depth * 230), rows are grouped by category (ai_research=60,
 * infrastructure=230, cooling=400, data=570), with agi_theory pulled up to
 * y=150 since it's the convergence point of the ai_research and cooling
 * chains rather than belonging to either lane alone.
 */
export const TECH_SPECS: TechSpec[] = [
  {
    id: "transformer_architecture",
    name: "Transformer Architecture",
    description: "Unlocks 1B-class model training and A100 Node.",
    costRp: 50,
    prerequisites: [],
    category: "ai_research",
    treePosition: { x: 60, y: 60 },
  },
  {
    id: "advanced_cooling",
    name: "Advanced Cooling",
    description: "Unlocks Liquid Cooling Loop.",
    costRp: 100,
    prerequisites: [],
    category: "cooling",
    treePosition: { x: 60, y: 400 },
  },
  {
    id: "scalable_training",
    name: "Scalable Training",
    description: "Unlocks 7B-class models and H100 Rack.",
    costRp: 300,
    prerequisites: ["transformer_architecture"],
    category: "ai_research",
    treePosition: { x: 290, y: 60 },
  },
  {
    id: "immersion_cooling",
    name: "Immersion Cooling",
    description: "Unlocks Immersion Cooling Tank.",
    costRp: 500,
    prerequisites: ["advanced_cooling"],
    category: "cooling",
    treePosition: { x: 290, y: 400 },
  },
  {
    id: "frontier_models",
    name: "Frontier Models",
    description: "Unlocks 70B-class model training.",
    costRp: 1200,
    prerequisites: ["scalable_training"],
    category: "ai_research",
    treePosition: { x: 520, y: 60 },
  },
  {
    id: "custom_silicon",
    name: "Custom Silicon",
    description: "Unlocks Custom Silicon Pod.",
    costRp: 2500,
    prerequisites: ["frontier_models"],
    category: "infrastructure",
    treePosition: { x: 750, y: 230 },
  },
  {
    id: "agi_theory",
    name: "AGI Theory",
    description: "Unlocks AGI-Omni 100T.",
    costRp: 10000,
    prerequisites: ["custom_silicon", "immersion_cooling"],
    category: "ai_research",
    treePosition: { x: 980, y: 150 },
  },
  // --- Sprint 2 additions, given real effects in the Feature Completion
  // Sprint: data-automation milestones. Each advances what
  // getDataAutomationStage() reports in the UI AND (as of the Feature
  // Completion Sprint) applies a real multiplier via
  // engine/automation.ts's getDataAutomationMultipliers(), consumed by
  // engine/tick.ts step 7. See that function's doc comment for the exact
  // (non-stacking) multiplier rules.
  {
    id: "data_pipeline",
    name: "Data Pipeline",
    description: "Increases Data Engineers' cleanData refinement rate (x1.5).",
    costRp: 400,
    prerequisites: [],
    category: "data",
    treePosition: { x: 60, y: 570 },
  },
  {
    id: "synthetic_data",
    name: "Synthetic Data",
    description: "Increases Data Engineers' rawData collection rate (x1.5).",
    costRp: 1500,
    prerequisites: ["data_pipeline"],
    category: "data",
    treePosition: { x: 290, y: 570 },
  },
  {
    id: "autonomous_data_factory",
    name: "Autonomous Data Factory",
    description: "Major boost to Data Engineers' rawData collection and cleanData refinement (x2.0 each, supersedes the earlier milestones on the same axis).",
    costRp: 4000,
    prerequisites: ["synthetic_data"],
    category: "data",
    treePosition: { x: 520, y: 570 },
  },

  // ---------------------------------------------------------------------
  // Phase 9 "Research Expansion Foundation" (spec section 3-3/3-4): a
  // FOUNDATION-scale addition (16 new techs, not the eventual ~100-node
  // tree - spec 3-6 explicitly rules that out for this sprint). Every
  // effect below connects to an EXISTING system (Phase 5 inference cost,
  // training speed, Phase 7 Internal Upgrades, Phase 8 Departments, or an
  // existing dataset-sale action) rather than a generic flat revenue bonus
  // - see the engine modules referenced in each comment for the actual
  // formula. Real (non-flavor) effect descriptions live in `description`
  // here per this file's existing convention; richer historicalNote/
  // businessImpact flavor lives in i18n/techLore.ts (spec 3-2 - reusing the
  // Phase 2 Polish sprint's existing lore system rather than inventing a
  // new one, per that spec section's own "or fit existing design" option).
  // ---------------------------------------------------------------------

  // -- Inference Optimization (engine/inferenceCost.ts, Phase 5) --
  {
    id: "quantization",
    name: "Quantization",
    description: "Reduces per-model inference cost by lowering numeric precision at serve time.",
    costRp: 800,
    prerequisites: [],
    category: "inference_optimization",
    treePosition: { x: 60, y: 1080 },
  },
  {
    id: "kv_cache_optimization",
    name: "KV Cache Optimization",
    description: "Further reduces inference cost specifically for Chat-category deployed models.",
    costRp: 1500,
    prerequisites: ["quantization"],
    category: "inference_optimization",
    treePosition: { x: 290, y: 1080 },
  },
  {
    id: "batch_inference",
    name: "Batch Inference",
    description: "Improves API revenue efficiency by batching inference requests, reducing per-request overhead.",
    costRp: 1500,
    // Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-3): moved from
    // y:1150 to y:1250 - at the old position this node's NODE_HEIGHT=110 box
    // overlapped kv_cache_optimization directly above it (same x, only a
    // 70px gap). No unlock condition/effect changed, only layout.
    prerequisites: ["quantization"],
    category: "inference_optimization",
    treePosition: { x: 290, y: 1250 },
  },
  {
    id: "speculative_decoding",
    name: "Speculative Decoding",
    description: "Reduces inference cost further by speculatively generating multiple tokens ahead.",
    costRp: 3000,
    prerequisites: ["kv_cache_optimization"],
    category: "inference_optimization",
    treePosition: { x: 520, y: 1080 },
  },
  {
    id: "model_distillation",
    name: "Model Distillation",
    description: "Improves gross margin on smaller deployed models by distilling them from larger ones.",
    costRp: 3500,
    // Phase 13.5 (spec 1-3): moved from y:1150 to y:1250 - same overlap
    // issue as batch_inference above, mirrored at x:520 (speculative_decoding
    // directly above it). No unlock condition/effect changed, only layout.
    prerequisites: ["batch_inference"],
    category: "inference_optimization",
    treePosition: { x: 520, y: 1250 },
  },

  // -- Training Optimization (engine/training.ts) --
  {
    id: "mixed_precision_training",
    name: "Mixed Precision Training",
    description: "Increases training speed by mixing lower-precision arithmetic into the training loop.",
    costRp: 600,
    prerequisites: [],
    category: "training_optimization",
    treePosition: { x: 60, y: 910 },
  },
  {
    id: "gradient_checkpointing",
    name: "Gradient Checkpointing",
    description: "Further increases training speed by trading recomputation for memory headroom.",
    costRp: 1800,
    prerequisites: ["mixed_precision_training"],
    category: "training_optimization",
    treePosition: { x: 290, y: 910 },
  },
  {
    id: "distributed_training",
    name: "Distributed Training",
    description: "Substantially increases training speed by splitting training work across more of the cluster.",
    costRp: 3200,
    prerequisites: ["gradient_checkpointing"],
    category: "training_optimization",
    treePosition: { x: 520, y: 910 },
  },

  // -- Data Engineering (existing dataset-sale actions: sellCleanDataset.ts / sellSyntheticDataset.ts) --
  {
    id: "synthetic_data_engine",
    name: "Synthetic Data Engine",
    description: "Increases revenue from selling synthetic datasets.",
    costRp: 2000,
    prerequisites: ["synthetic_data"],
    category: "data",
    treePosition: { x: 750, y: 570 },
  },
  {
    id: "dataset_quality_scoring",
    name: "Dataset Quality Scoring",
    description: "Increases revenue from selling clean datasets by scoring and pricing them more accurately.",
    costRp: 1200,
    prerequisites: ["data_pipeline"],
    category: "data",
    treePosition: { x: 980, y: 570 },
  },

  // -- Infrastructure / Energy (data/facilityUpgrades.ts, Phase 7 Internal Upgrades) --
  {
    id: "power_distribution",
    name: "Power Distribution",
    description: "Increases the effect of the Power Capacity Internal Upgrade.",
    costRp: 2800,
    prerequisites: ["custom_silicon"],
    category: "energy",
    treePosition: { x: 750, y: 1420 },
  },
  {
    id: "rack_density_planning",
    name: "Rack Density Planning",
    description: "Increases the effect of the Rack Space Internal Upgrade.",
    costRp: 2800,
    prerequisites: ["custom_silicon"],
    category: "infrastructure",
    treePosition: { x: 980, y: 230 },
  },

  // -- Organization / Business (engine/departmentEffects.ts, Phase 8 Departments) --
  {
    id: "financial_planning",
    name: "Financial Planning",
    description: "Increases the Finance department's expense-discount effect.",
    costRp: 1000,
    prerequisites: [],
    category: "organization",
    treePosition: { x: 60, y: 1420 },
  },
  {
    id: "hr_process",
    name: "HR Process",
    description: "Increases the HR department's hiring-cost-discount effect.",
    costRp: 1000,
    prerequisites: [],
    category: "organization",
    treePosition: { x: 290, y: 1420 },
  },
  {
    id: "compliance_program",
    name: "Compliance Program",
    description: "Increases the Legal/Compliance department's (display) risk-reduction effect.",
    costRp: 2500,
    prerequisites: ["financial_planning", "hr_process"],
    category: "organization",
    treePosition: { x: 520, y: 1420 },
  },
  {
    id: "customer_success_playbook",
    name: "Customer Success Playbook",
    description: "Increases the Customer Success department's reputation-growth effect.",
    costRp: 1200,
    prerequisites: [],
    category: "organization",
    treePosition: { x: 750, y: 1250 },
  },
];

export const TECH_SPEC_MAP: Record<string, TechSpec> = Object.fromEntries(
  TECH_SPECS.map((spec) => [spec.id, spec]),
);

export function getTechSpec(id: string): TechSpec | undefined {
  return TECH_SPEC_MAP[id];
}
