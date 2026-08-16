import type { GpuSpec } from "../types/hardware";

/**
 * Requirements doc section 7.2, expanded in the Progression Expansion Sprint
 * (spec section 2: "GPUラインナップ拡張") with 6 new entries bridging the gaps
 * between the original 5 tiers. Every original id/cost/compute value is
 * UNCHANGED (existing saves' ownedGpus still resolve correctly) - the new
 * entries are inserted at their natural place in the compute progression.
 * Higher tiers reuse EXISTING tech-tree nodes for unlockTechId rather than
 * adding new tech content (out of this sprint's scope), so the tech tree
 * itself never grows.
 */
export const GPU_SPECS: GpuSpec[] = [
  {
    id: "used_gtx_cluster",
    // Early Game Milestone & Balance Sprint: 2500 -> 1800 so the first GPU
    // purchase clears comfortably in the 1-2 minute window even before any
    // early-game bonuses have landed.
    name: "Used GTX Cluster",
    cost: 1800,
    compute: 20,
    vram: 24,
    powerUsage: 2,
    heatGeneration: 8,
  },
  {
    // Progression Expansion Sprint: fills the gap between Used GTX Cluster
    // and RTX Prosumer Rig so the early GPU shop has more than one step.
    id: "rtx3060_cluster",
    name: "RTX 3060 Cluster",
    cost: 3200,
    compute: 42,
    vram: 36,
    powerUsage: 3,
    heatGeneration: 12,
  },
  {
    id: "rtx4090_cluster",
    name: "RTX 4090 Cluster",
    cost: 6500,
    compute: 85,
    vram: 64,
    powerUsage: 4,
    heatGeneration: 15,
  },
  {
    id: "rtx_prosumer_rig",
    // Early Game Milestone & Balance Sprint: 12000 -> 9000 so it's a
    // realistic ~20-30min target alongside the first bonuses/contracts.
    name: "RTX Prosumer Rig",
    cost: 9000,
    compute: 120,
    vram: 96,
    powerUsage: 5,
    heatGeneration: 18,
  },
  {
    // Progression Expansion Sprint: mid-tier step before A100 Node, no tech
    // gate needed (same "buy it if you can afford it" pattern as the other
    // pre-Transformer-Architecture GPUs).
    id: "a40_rack",
    name: "A40 Rack",
    cost: 35000,
    compute: 400,
    vram: 192,
    powerUsage: 8,
    heatGeneration: 28,
  },
  {
    id: "a100_node",
    name: "A100 Node",
    cost: 80000,
    compute: 900,
    vram: 320,
    powerUsage: 12,
    heatGeneration: 40,
    unlockTechId: "transformer_architecture",
  },
  {
    id: "h100_rack",
    name: "H100 Rack",
    cost: 600000,
    compute: 8000,
    vram: 1600,
    powerUsage: 80,
    heatGeneration: 180,
    unlockTechId: "scalable_training",
  },
  {
    // Progression Expansion Sprint: late-game tier, gated on Frontier Models
    // (the existing tech that unlocks 70B-class training) rather than a new
    // tech node - both MI300 and B200 become available together with
    // TitanLM 70B's training requirement.
    id: "mi300_cluster",
    name: "MI300 Cluster",
    cost: 2200000,
    compute: 20000,
    vram: 3200,
    powerUsage: 150,
    heatGeneration: 320,
    unlockTechId: "frontier_models",
  },
  {
    // Steam-quality UI/UX review sprint (docs/2026-08-15 review, section
    // 3.3): re-gated frontier_models -> custom_silicon so B200 lines up with
    // the review's explicit "Custom Silicon系研究 -> B200 / Custom Silicon級"
    // pairing, and so it doesn't unlock simultaneously with MI300 Cluster
    // (both gated on frontier_models previously) - now MI300 is the
    // Frontier Models payoff and B200 is the further Custom Silicon payoff,
    // giving the endgame GPU curve one more distinct step.
    id: "b200_superpod",
    name: "B200 Super Pod",
    cost: 5500000,
    compute: 60000,
    vram: 6000,
    powerUsage: 300,
    heatGeneration: 600,
    unlockTechId: "custom_silicon",
  },
  {
    id: "custom_silicon_pod",
    name: "Custom Silicon Pod",
    cost: 5000000,
    compute: 100000,
    vram: 8000,
    powerUsage: 500,
    heatGeneration: 1000,
    unlockTechId: "custom_silicon",
  },
  {
    // Progression Expansion Sprint: endgame tier, gated on AGI Theory - the
    // same tech that unlocks AGI-Omni 100T, so this becomes purchasable
    // exactly when it starts to matter.
    id: "exascale_compute_array",
    name: "Exascale Compute Array",
    cost: 60000000,
    compute: 1200000,
    vram: 100000,
    powerUsage: 4000,
    heatGeneration: 8000,
    unlockTechId: "agi_theory",
  },
];

export const GPU_SPEC_MAP: Record<string, GpuSpec> = Object.fromEntries(
  GPU_SPECS.map((spec) => [spec.id, spec]),
);

export function getGpuSpec(id: string): GpuSpec | undefined {
  return GPU_SPEC_MAP[id];
}
