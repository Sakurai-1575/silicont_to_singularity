import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import type { StaffRole } from "../../types/staff";
import type { DepartmentId } from "../../types/departments";
import { validateAssignStaffToDepartment } from "../../engine/validation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/** Japanese display names for the Event Log - same convention/rationale as hireStaff.ts's STAFF_ROLE_JA (engine/data files must not import the UI i18n layer). */
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

const DEPARTMENT_JA: Record<DepartmentId, string> = {
  research: "Research部門",
  data: "Data部門",
  infrastructure: "Infrastructure部門",
  sales: "Sales部門",
  enterpriseSales: "Enterprise Sales部門",
  finance: "Finance部門",
  hr: "HR部門",
  legal: "Legal/Compliance部門",
  customerSuccess: "Customer Success部門",
};

/**
 * +/- department (re)assignment button (Phase 8 spec section 2-2/2-4).
 * Costs no cash, moves headcount between "Unassigned" and a Department (or
 * between two Departments only via two calls - one -1 then one +1, kept
 * simple rather than a single move-between-departments variant since the UI
 * only ever needs +/- on one department at a time). Works identically
 * whether Time Control is Paused or running (no gameTimeSeconds/tick
 * dependency at all), and regardless of bankruptcy state - see
 * validateAssignStaffToDepartment's doc comment.
 */
export function assignStaffToDepartment(
  get: Get,
  set: Set,
  role: StaffRole,
  department: DepartmentId,
  delta: number,
): ActionResult<void> {
  const state = get();
  const result = validateAssignStaffToDepartment(state, role, department, delta);
  if (!result.success) return result;

  set((s) => {
    const roleAssignments = { ...(s.departmentAssignments[role] ?? {}) };
    roleAssignments[department] = Math.max(0, (roleAssignments[department] ?? 0) + delta);
    return {
      departmentAssignments: { ...s.departmentAssignments, [role]: roleAssignments },
      eventLog: appendEvent(
        s.eventLog,
        "info",
        `${STAFF_ROLE_JA[role]}を${DEPARTMENT_JA[department]}に${delta > 0 ? `${delta}名配置` : `${-delta}名配置解除`}しました。`,
        s.gameTimeSeconds,
      ),
    };
  });
  saveGame(get());
  playSound("uiClick");
  return ok(undefined);
}
