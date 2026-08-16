import { useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { STAFF_SPECS } from "../game/data";
import type { StaffRole, StaffTier } from "../game/types/staff";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { formatRate } from "../game/utils/format";
import { EquipmentCard, GameButton, ConfirmDialog, type IconKind } from "./ui";
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
  const fireStaff = useGameStore((s) => s.fireStaff);
  const staffMorale = useGameStore((s) => s.staffMorale);

  // Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5): confirmation
  // gate for firing, same pattern as TrainingPanel.tsx's confirmCancelTraining.
  const [confirmFireRole, setConfirmFireRole] = useState<StaffRole | null>(null);

  const counts = state as unknown as Record<StaffRole, number>;

  return (
    <div className="flex flex-col gap-4">
      {/* Phase 13.5 (spec 1-5): staffMorale foundation display - no gameplay
          effect wired yet this phase (see types/staff.ts's doc comment). */}
      <div className="game-card flex items-center justify-between px-3 py-2">
        <span className="text-[10px] uppercase tracking-wide text-ink-muted">{t("staff.morale")}</span>
        <span className="font-display text-sm text-cyan-neon">{Math.round(staffMorale)} / 100</span>
      </div>

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
                  <div key={spec.id} className="flex flex-col gap-1.5">
                    <EquipmentCard
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
                    {/* Phase 13.5 (spec 1-5): fire/layoff, adjacent to the card
                        since EquipmentCard only has one action slot. */}
                    <GameButton
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      disabled={ownedCount <= 0}
                      onClick={() => setConfirmFireRole(spec.id)}
                    >
                      {t("staff.fire")}
                    </GameButton>
                  </div>
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

      {/* Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-5): fire confirmation. */}
      {confirmFireRole && (
        <ConfirmDialog
          title={t("staff.fireConfirmTitle")}
          message={t("staff.fireConfirmMessage", { role: getDisplayName("staff", confirmFireRole, language) })}
          confirmLabel={t("staff.fireConfirmButton")}
          cancelLabel={t("staff.fireBackButton")}
          onCancel={() => setConfirmFireRole(null)}
          onConfirm={() => {
            fireStaff(confirmFireRole, 1);
            setConfirmFireRole(null);
          }}
        />
      )}
    </div>
  );
}
