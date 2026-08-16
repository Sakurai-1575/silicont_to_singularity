/**
 * Phase 6 "Milestone & Chapter Expansion Sprint" (spec section 14, the 8
 * required Chapters). Purely organizational data - no new persisted state,
 * no gating logic. A Chapter groups a handful of already-existing Objective
 * ids (engine/objectives.ts's OBJECTIVE_DEFINITIONS - none were removed or
 * changed to build this) under a named purpose and points at the one
 * Milestone (engine/milestones.ts) that represents "this chapter is done."
 * See engine/chapters.ts for the derived "which chapter is the player in
 * right now" / progress-counting logic that reads this data against live
 * GameState.
 */
export type ChapterDefinition = {
  id: string;
  order: number;
  nameKey: string;
  purposeKey: string;
  /** Representative Objective ids (engine/objectives.ts) shown in the Chapter UI's in-chapter progress list. */
  objectiveIds: string[];
  /** The Milestone (engine/milestones.ts) that represents this chapter's completion. */
  milestoneId: string;
};

export const CHAPTERS: ChapterDefinition[] = [
  {
    id: "garage_startup",
    order: 1,
    nameKey: "chapters.items.garage_startup.name",
    purposeKey: "chapters.items.garage_startup.purpose",
    // Phase 7.5 "Facility Objective / Milestone / Balance Polish": added facility_internal_upgrade_first.
    objectiveIds: ["gather_data", "buy_gpu", "tinynet_training_started", "tinynet_complete", "tinynet_deployed", "facility_internal_upgrade_first"],
    milestoneId: "first_product_launch",
  },
  {
    id: "first_product",
    order: 2,
    nameKey: "chapters.items.first_product.name",
    purposeKey: "chapters.items.first_product.purpose",
    objectiveIds: ["tinynet_deployed", "first_api_revenue", "first_subscriber", "first_gross_profit"],
    milestoneId: "first_revenue",
  },
  {
    id: "revenue_engine",
    order: 3,
    nameKey: "chapters.items.revenue_engine.name",
    purposeKey: "chapters.items.revenue_engine.purpose",
    objectiveIds: ["api_revenue_10ps", "model_gross_profit_10", "portfolio_gross_margin_50", "inference_cost_efficient"],
    milestoneId: "first_profitable_ai_product",
  },
  {
    id: "scaling_the_team",
    order: 4,
    nameKey: "chapters.items.scaling_the_team.name",
    purposeKey: "chapters.items.scaling_the_team.purpose",
    // Phase 7.5: added facility_reach_small_ai_lab + facility_power_lv3.
    objectiveIds: [
      "portfolio_deploy_2",
      "portfolio_revenue_100ps",
      "staff_10",
      "upgrade_small_office",
      "facility_reach_small_ai_lab",
      "facility_power_lv3",
    ],
    milestoneId: "ai_product_portfolio",
  },
  {
    id: "enterprise_expansion",
    order: 5,
    nameKey: "chapters.items.enterprise_expansion.name",
    purposeKey: "chapters.items.enterprise_expansion.purpose",
    objectiveIds: ["enterprise_deals_1", "enterprise_deals_5", "reputation_75"],
    milestoneId: "enterprise_ai_vendor",
  },
  {
    id: "frontier_research",
    order: 6,
    nameKey: "chapters.items.frontier_research.name",
    purposeKey: "chapters.items.frontier_research.purpose",
    // Phase 7.5: added facility_reach_server_room + facility_reach_data_center.
    objectiveIds: [
      "unlock_transformer",
      "unlock_frontier_models",
      "buy_a100",
      "frontierlm_complete",
      "facility_reach_server_room",
      "facility_reach_data_center",
    ],
    milestoneId: "frontier_lab",
  },
  {
    id: "hyperscale_operations",
    order: 7,
    nameKey: "chapters.items.hyperscale_operations.name",
    purposeKey: "chapters.items.hyperscale_operations.purpose",
    // Phase 7.5: added facility_internal_upgrades_10.
    objectiveIds: ["expand_hyperscale", "portfolio_gross_profit_1000", "valuation_100m", "facility_internal_upgrades_10"],
    milestoneId: "hyperscale_ai_company",
  },
  {
    id: "path_to_agi",
    order: 8,
    nameKey: "chapters.items.path_to_agi.name",
    purposeKey: "chapters.items.path_to_agi.purpose",
    // Phase 7.5: added facility_reach_singularity_complex.
    objectiveIds: ["unlock_agi_theory", "agi_omni_training_started", "train_agi_omni", "facility_reach_singularity_complex"],
    milestoneId: "agi_breakthrough",
  },
];

export function getChapterDefinition(id: string): ChapterDefinition | undefined {
  return CHAPTERS.find((c) => c.id === id);
}
