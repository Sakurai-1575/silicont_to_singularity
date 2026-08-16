import { useGameStore } from "../game/store/gameStore";
import { STAFF_SPECS } from "../game/data";
import type { StaffRole, StaffTier } from "../game/types/staff";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { formatRate } from "../game/utils/format";
import { EquipmentCard, type IconKind } from "./ui";
import DepartmentPanel from "./DepartmentPanel";

const TIER_ICON: Record<StaffTier, IconKind> = {
  data: "staffDataEngineer",
  research: "staffResearcher",
  infra: "staffInfraOps",
  business: "staffBusiness",
  executive: "staffBusiness",
};

const TIER_ORDER: StaffTier[] = ["data", "research", "infra", "business", "executive"];

/**
 * 組織 tab (UI Professional Polish Sprint section 9: "personnel / ID-card"
 * feel, distinct from the other tabs' shop/board treatments). Rewritten in
 * the Progression Expansion Sprint (spec section 10) from a hardcoded-to-3
 * -roles Record<StaffRole,X> layout to a generic loop over STAFF_SPECS,
 * grouped by StaffSpec.tier - this is what lets the 8 new roles show up with
 * zero further changes to this file if a future sprint adds a 12th.
 *
 * Per-role effect text now comes from i18n/dataNames.ts's STAFF table
 * (getDisplayDescription) instead of parameterized t() strings - a slightly
 * less dynamic (no live headcount-based numbers) but far simpler approach
 * that scales to 11 roles without hand-writing 11 interpolation cases; the
 * headcount itself is still shown live via EquipmentCard's ownedCount badge.
 */
export default function StaffPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);
  const state = useGameStore((s) => s);
  const hireStaff = useGameStore((s) => s.hireStaff);

  const counts = state as unknown as Record<StaffRole, number>;

  return (
    <div className="flex flex-col gap-4">
      {TIER_ORDER.map((tier) => {
        const specs = STAFF_SPECS.filter((spec) => spec.tier === tier);
        if (specs.length === 0) return null;
        return (
          <section key={tier}>
            <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-cyan-neon">
              {t("staff.title")} - {t(`staff.tiers.${tier}`)}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {specs.map((spec) => {
                const ownedCount = counts[spec.id] ?? 0;
                const atCap = spec.maxCount !== undefined && ownedCount >= spec.maxCount;
                const affordable = state.cash >= spec.hireCost && !atCap;
                return (
                  <EquipmentCard
                    key={spec.id}
                    icon={TIER_ICON[tier]}
                    name={getDisplayName("staff", spec.id, language)}
                    description={getDisplayDescription("staff", spec.id, language)}
                    ownedCount={ownedCount}
                    priceLabel={fmt.cash(spec.hireCost)}
                    glow={affordable}
                    locked={atCap}
                    lockReason={atCap ? t("staff.capReached") : undefined}
                    stats={[
                      { label: "SALARY", value: `${formatRate(spec.salaryPerSecond)}` },
                      ...(spec.maxCount !== undefined ? [{ label: "CAP", value: `${ownedCount}/${spec.maxCount}` }] : []),
                    ]}
                    actionLabel={t("staff.hire")}
                    onAction={() => hireStaff(spec.id)}
                    actionDisabled={!affordable}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Phase 8 "Employee Assignment & Departments Foundation" (spec section
          2-4): a separate section below the existing hire UI, never replacing
          it - department ASSIGNMENT of already-hired staff is a distinct
          action from HIRING new staff above. */}
      <DepartmentPanel />
    </div>
  );
}
