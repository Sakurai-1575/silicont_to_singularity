import { useGameStore } from "../game/store/gameStore";
import { DEPARTMENT_DEFINITIONS } from "../game/data/departments";
import type { DepartmentId } from "../game/types/departments";
import type { StaffRole } from "../game/types/staff";
import { ALL_STAFF_ROLES, getDepartmentHeadcount, getRoleUnassignedCount, getTotalAssignedHeadcount } from "../game/engine/departments";
import {
  getResearchDepartmentBonus,
  getDataDepartmentBonus,
  getInfrastructureDepartmentCoolingHeads,
  getSalesDepartmentBonus,
  getEnterpriseSalesDepartmentBonus,
  getFinanceDepartmentExpenseDiscount,
  getHrDepartmentHiringCostDiscount,
  getLegalDepartmentDisplayRiskReduction,
  getCustomerSuccessDepartmentReputationBonus,
} from "../game/engine/departmentEffects";
import type { GameState } from "../game/types/game";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { Badge, GameButton } from "./ui";

/** Live formatted effect value + i18n key for a department, given the current GameState. Percent-style effects are returned already *100. */
function getDepartmentEffectDisplay(id: DepartmentId, state: GameState): { key: string; value: string } {
  switch (id) {
    case "research":
      return { key: "research", value: (getResearchDepartmentBonus(state) * 100).toFixed(1) };
    case "data":
      return { key: "data", value: (getDataDepartmentBonus(state) * 100).toFixed(1) };
    case "infrastructure":
      return { key: "infrastructure", value: getInfrastructureDepartmentCoolingHeads(state).toFixed(1) };
    case "sales":
      return { key: "sales", value: (getSalesDepartmentBonus(state) * 100).toFixed(1) };
    case "enterpriseSales":
      return { key: "enterpriseSales", value: (getEnterpriseSalesDepartmentBonus(state) * 100).toFixed(1) };
    case "finance":
      return { key: "finance", value: (getFinanceDepartmentExpenseDiscount(state) * 100).toFixed(1) };
    case "hr":
      return { key: "hr", value: (getHrDepartmentHiringCostDiscount(state) * 100).toFixed(1) };
    case "legal":
      return { key: "legal", value: (getLegalDepartmentDisplayRiskReduction(state) * 100).toFixed(1) };
    case "customerSuccess":
      return { key: "customerSuccess", value: getCustomerSuccessDepartmentReputationBonus(state).toFixed(3) };
  }
}

/**
 * Phase 8 "Employee Assignment & Departments Foundation" (spec section 2-4):
 * "assign already-hired staff to a Department" UI, added to the 組織 (Org)
 * tab BELOW StaffPanel's existing hire UI (spec 2-4: existing hire UI must
 * not be removed/replaced, new assignment UI stays a separate section).
 * Purely a thin view over engine/departments.ts's headcount math +
 * engine/departmentEffects.ts's live effect formulas - all game logic lives
 * there, this component only renders numbers and dispatches +/-1 clicks to
 * the assignStaffToDepartment action (store/actions/assignStaffToDepartment.ts).
 */
export default function DepartmentPanel() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const state = useGameStore((s) => s);
  const assignStaffToDepartment = useGameStore((s) => s.assignStaffToDepartment);

  const rolesWithHeadcount = ALL_STAFF_ROLES.filter((role) => ((state as unknown as Record<StaffRole, number>)[role] ?? 0) > 0);
  const totalAssigned = getTotalAssignedHeadcount(state);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-[11px] uppercase tracking-widest text-cyan-neon">{t("departments.title")}</h3>
        <Badge tone="cyan">{t("departments.assignedTotal")}: {totalAssigned}</Badge>
      </div>
      <p className="mb-3 text-[10px] text-ink-muted">{t("departments.hint")}</p>

      {rolesWithHeadcount.length === 0 ? (
        <div className="game-card p-3 text-[11px] text-ink-muted">{t("departments.noStaffHint")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DEPARTMENT_DEFINITIONS.map((dept) => {
            const headcount = getDepartmentHeadcount(state, dept.id);
            const effect = getDepartmentEffectDisplay(dept.id, state);
            return (
              <div key={dept.id} className="game-card flex flex-col gap-1.5 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink-primary">{getDisplayName("department", dept.id, language)}</h4>
                  <Badge tone={headcount > 0 ? "green" : "neutral"}>{headcount}</Badge>
                </div>
                <div className="text-[10px] text-ink-muted">{getDisplayDescription("department", dept.id, language)}</div>
                <div className="stat-chip text-cyan-neon text-[10px]">
                  <span className="text-ink-muted">{t("departments.effect")}</span> {t(`departments.effects.${effect.key}`, { value: effect.value })}
                </div>

                <div className="mt-1 flex flex-col gap-1 border-t border-borderdim pt-1.5">
                  {rolesWithHeadcount.map((role) => {
                    const assignedHere = state.departmentAssignments[role]?.[dept.id] ?? 0;
                    const unassigned = getRoleUnassignedCount(state, role);
                    const hired = (state as unknown as Record<StaffRole, number>)[role] ?? 0;
                    if (hired === 0) return null;
                    return (
                      <div key={role} className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="truncate text-ink-primary" title={getDisplayName("staff", role, language)}>
                          {getDisplayName("staff", role, language)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-ink-muted">
                            {assignedHere}/{hired}
                          </span>
                          <GameButton
                            size="sm"
                            variant="ghost"
                            className="!px-1 !py-0"
                            title={t("departments.unassignButton")}
                            disabled={assignedHere <= 0}
                            onClick={() => assignStaffToDepartment(role, dept.id, -1)}
                          >
                            -
                          </GameButton>
                          <GameButton
                            size="sm"
                            variant="ghost"
                            className="!px-1 !py-0"
                            title={t("departments.assignButton")}
                            disabled={unassigned <= 0}
                            onClick={() => assignStaffToDepartment(role, dept.id, 1)}
                          >
                            +
                          </GameButton>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

