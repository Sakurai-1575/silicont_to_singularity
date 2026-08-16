import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateUpgradeFacility } from "../../engine/validation";
import { getFacilitySpec } from "../../data/facilities";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";

/** Upgrade Facility button (spec 21.5). */
export function upgradeFacility(get: Get, set: Set, facilityId: string): ActionResult<void> {
  const state = get();
  const result = validateUpgradeFacility(state, facilityId);
  if (!result.success) return result;

  const spec = getFacilitySpec(facilityId);
  if (!spec) return result; // unreachable - validateUpgradeFacility already checked this

  set((s) => ({
    cash: s.cash - spec.upgradeCost,
    facilityId: spec.id,
    powerCapacity: spec.powerCapacity,
    // Phase 7 "Facility Expansion & Internal Upgrades Sprint" (spec section
    // 26): relocating to a new facility is distinct from strengthening the
    // current one - every Internal Upgrade level resets to 0 on relocation
    // (see types/hardware.ts's doc comment on these 4 fields).
    facilityPowerUpgradeLevel: 0,
    facilityCoolingUpgradeLevel: 0,
    facilityRackUpgradeLevel: 0,
    facilityNetworkUpgradeLevel: 0,
    eventLog: appendEvent(s.eventLog, "success", `拠点を${spec.name}にアップグレードしました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  return ok(undefined);
}
