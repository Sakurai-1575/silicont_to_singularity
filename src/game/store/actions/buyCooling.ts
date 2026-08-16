import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { OwnedCooling } from "../../types/hardware";
import { validateBuyCooling } from "../../engine/validation";
import { getCoolingSpec } from "../../data/cooling";
import { generateId } from "../../utils/random";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/** Buy Cooling button (spec 21.4). */
export function buyCooling(get: Get, set: Set, coolingId: string): ActionResult<void> {
  const state = get();
  const result = validateBuyCooling(state, coolingId);
  if (!result.success) return result;

  const spec = getCoolingSpec(coolingId);
  if (!spec) return result; // unreachable - validateBuyCooling already checked this

  const newCooling: OwnedCooling = { instanceId: generateId("cool"), specId: coolingId };
  set((s) => ({
    cash: s.cash - spec.cost,
    ownedCooling: [...s.ownedCooling, newCooling],
    eventLog: appendEvent(s.eventLog, "success", `${spec.name}を購入しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
