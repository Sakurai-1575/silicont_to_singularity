import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateUpgradeFacilityInternal, FACILITY_UPGRADE_LEVEL_FIELD } from "../../engine/validation";
import type { FacilityUpgradeCategory } from "../../data/facilityUpgrades";
import { getFacilityUpgradeCost } from "../../data/facilityUpgrades";
import { getFacilityIndex } from "../../data/facilities";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

const CATEGORY_LABEL_JA: Record<FacilityUpgradeCategory, string> = {
  power: "電力容量",
  cooling: "冷却容量",
  rack: "ラックスペース",
  network: "ネットワーク帯域",
};

/**
 * Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section
 * 22-23): "Internal Upgrade" purchase button - strengthens the facility the
 * player is CURRENTLY in by one level, as opposed to upgradeFacility.ts
 * (which relocates to an entirely new, bigger facility and resets every
 * Internal Upgrade level back to 0 - see that file). Effects are applied
 * automatically every tick by engine/tick.ts's Step 2 reading the new level
 * straight off GameState - this action only spends cash and bumps the level.
 */
export function upgradeFacilityInternal(get: Get, set: Set, category: FacilityUpgradeCategory): ActionResult<void> {
  const state = get();
  const result = validateUpgradeFacilityInternal(state, category);
  if (!result.success) return result;

  const facilityIndex = getFacilityIndex(state.facilityId);
  const field = FACILITY_UPGRADE_LEVEL_FIELD[category];
  const currentLevel = state[field];
  const cost = getFacilityUpgradeCost(category, facilityIndex, currentLevel);

  set((s) => ({
    cash: s.cash - cost,
    [field]: s[field] + 1,
    // Phase 7.5 "Facility Objective / Milestone / Balance Polish": monotonic
    // counter, never reset by relocation - see types/hardware.ts's doc comment.
    totalFacilityInternalUpgradesPerformed: s.totalFacilityInternalUpgradesPerformed + 1,
    eventLog: appendEvent(
      s.eventLog,
      "success",
      `${CATEGORY_LABEL_JA[category]}をLv.${currentLevel + 1}にアップグレードしました。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  playSound("upgrade");
  return ok(undefined);
}
