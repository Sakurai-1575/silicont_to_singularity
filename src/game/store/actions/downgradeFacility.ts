import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateDowngradeFacility } from "../../engine/validation";
import { FACILITY_SPECS, getFacilityIndex } from "../../data/facilities";
import { getFacilityUpgradeMaxLevel } from "../../data/facilityUpgrades";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";

/**
 * Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-4): "縮小移転"
 * (downgrade) button - relocates to the facility exactly ONE tier below the
 * current one, the inverse of store/actions/upgradeFacility.ts. Free of cost
 * for this phase (no reputation loss / staff morale loss / relocation fee
 * yet - spec explicitly says "今回は大きなペナルティは不要"), but structured so a
 * future phase can attach one: the whole effect lives in this one action, and
 * nothing else in the codebase assumes downgrade is impossible or must be
 * free.
 *
 * Reduces ongoing maintenance cost (engine/tick.ts's Step reading
 * getFacilitySpec(state.facilityId).maintenanceCostPerSecond directly - no
 * separate field to update here) and powerCapacity, exactly mirroring
 * upgradeFacility's own direct spec.powerCapacity assignment.
 *
 * Safety: the 4 Internal Upgrade levels are clamped (not reset to 0 like an
 * upgrade-relocation) to the new, lower facility's max level via
 * getFacilityUpgradeMaxLevel, so a level bought at a bigger facility can
 * never silently exceed what the smaller facility supports. Objective/
 * Milestone/Chapter completion is untouched by this action - per Phase
 * 13.5's Priority S fix (engine/objectives.ts/milestones.ts), completion is
 * sticky via completedObjectiveIds/completedMilestoneIds regardless of any
 * later state reduction, so past achievements are automatically preserved
 * without this file needing to do anything special.
 */
export function downgradeFacility(get: Get, set: Set): ActionResult<void> {
  const state = get();
  const result = validateDowngradeFacility(state);
  if (!result.success) return result;

  const currentIndex = getFacilityIndex(state.facilityId);
  const targetIndex = currentIndex - 1;
  const targetSpec = FACILITY_SPECS[targetIndex];
  if (!targetSpec) return result; // unreachable - validateDowngradeFacility already checked this

  const maxPower = getFacilityUpgradeMaxLevel("power", targetIndex);
  const maxCooling = getFacilityUpgradeMaxLevel("cooling", targetIndex);
  const maxRack = getFacilityUpgradeMaxLevel("rack", targetIndex);
  const maxNetwork = getFacilityUpgradeMaxLevel("network", targetIndex);

  set((s) => ({
    facilityId: targetSpec.id,
    powerCapacity: targetSpec.powerCapacity,
    facilityPowerUpgradeLevel: Math.min(s.facilityPowerUpgradeLevel, maxPower),
    facilityCoolingUpgradeLevel: Math.min(s.facilityCoolingUpgradeLevel, maxCooling),
    facilityRackUpgradeLevel: Math.min(s.facilityRackUpgradeLevel, maxRack),
    facilityNetworkUpgradeLevel: Math.min(s.facilityNetworkUpgradeLevel, maxNetwork),
    eventLog: appendEvent(
      s.eventLog,
      "info",
      `${targetSpec.name}へ縮小移転しました。維持費が下がりました。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  return ok(undefined);
}
