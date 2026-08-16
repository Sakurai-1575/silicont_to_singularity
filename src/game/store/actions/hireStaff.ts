import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { StaffRole } from "../../types/staff";
import { validateHireStaff } from "../../engine/validation";
import { getEffectiveHireCost } from "../../engine/earlyGame";
import { getStaffSpec } from "../../data/staff";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/** Japanese display names for the Event Log - kept here (not spec.name, which is English) since
 * engine/data files must not import the UI i18n layer (see game/i18n/index.ts's documented
 * cross-layer exception list, which this is deliberately NOT part of). */
const STAFF_ROLE_JA: Record<StaffRole, string> = {
  dataEngineers: "データエンジニア",
  infraOps: "インフラ運用スタッフ",
  researchers: "AIリサーチャー",
  seniorDataEngineers: "シニアデータエンジニア",
  seniorResearchers: "シニアリサーチャー",
  principalScientists: "プリンシパルサイエンティスト",
  infraLeads: "インフラリード",
  salesManagers: "セールスマネージャー",
  enterpriseSalesReps: "エンタープライズ営業",
  cto: "CTO",
  coo: "COO",
};

/** Hire Data Engineer / Hire Infra Ops / Hire AI Researcher buttons (spec 18.5). */
export function hireStaff(get: Get, set: Set, role: StaffRole): ActionResult<void> {
  const state = get();
  const result = validateHireStaff(state, role);
  if (!result.success) return result;

  const spec = getStaffSpec(role);
  if (!spec) return result; // unreachable - validateHireStaff already checked this

  set((s) => ({
    cash: s.cash - getEffectiveHireCost(spec, s),
    [role]: s[role] + 1,
    eventLog: appendEvent(s.eventLog, "success", `${STAFF_ROLE_JA[role]}を採用しました。`, s.gameTimeSeconds),
  }));
  saveGame(get());
  playSound("hire");
  return ok(undefined);
}
