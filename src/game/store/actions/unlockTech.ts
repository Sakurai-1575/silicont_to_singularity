import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateUnlockTech } from "../../engine/validation";
import { getTechSpec } from "../../data/techs";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";
// Deliberate cross-layer import (same rationale as systemActions.ts's
// useSettingsStore import): CelebrationBanner's queue is a UI-layer concern,
// not GameState - see app/celebrationStore.ts's doc comment.
import { useCelebrationStore } from "../../../app/celebrationStore";

/** Unlock Tech button (spec section 19 / 24.2). */
export function unlockTech(get: Get, set: Set, techId: string): ActionResult<void> {
  const state = get();
  const result = validateUnlockTech(state, techId);
  if (!result.success) return result;

  const spec = getTechSpec(techId);
  if (!spec) return result; // unreachable - validateUnlockTech already checked this

  set((s) => ({
    researchPoints: s.researchPoints - spec.costRp,
    unlockedTechIds: [...s.unlockedTechIds, spec.id],
    eventLog: appendEvent(s.eventLog, "success", `技術を解放しました: ${spec.name}`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("researchUnlock");
  useCelebrationStore.getState().push({ kind: "techUnlock", refId: spec.id, level: "normal" });
  return ok(undefined);
}
