import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { OwnedGpu } from "../../types/hardware";
import { validateBuyGpu } from "../../engine/validation";
import { getGpuSpec } from "../../data/gpus";
import { generateId } from "../../utils/random";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/** Buy GPU button (spec 21.3). */
export function buyGpu(get: Get, set: Set, gpuId: string): ActionResult<void> {
  const state = get();
  const result = validateBuyGpu(state, gpuId);
  if (!result.success) return result;

  const spec = getGpuSpec(gpuId);
  if (!spec) return result; // unreachable - validateBuyGpu already checked this

  const newGpu: OwnedGpu = { instanceId: generateId("gpu"), specId: gpuId };
  set((s) => ({
    cash: s.cash - spec.cost,
    ownedGpus: [...s.ownedGpus, newGpu],
    eventLog: appendEvent(s.eventLog, "success", `${spec.name}を購入しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("buy");
  return ok(undefined);
}
