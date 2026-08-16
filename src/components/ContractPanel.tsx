import { useGameStore } from "../game/store/gameStore";
import { BALANCE } from "../game/data/balance";
import { isPrototypeContractEligible, isDataCleaningContractEligible, getDataCleaningContractCooldownRemaining } from "../game/data/contracts";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { Badge, EquipmentCard } from "./ui";

/**
 * Early-game contract board (Early Game Milestone & Balance Sprint spec
 * section 7): surfaces the Prototype Contract and Data Cleaning Contract
 * introduced in section 4, kept deliberately separate from EnterprisePanel's
 * Enterprise License cards (spec section 14: "既存のEnterprise Licenseと明確に
 * 区別すること") even though it reuses the same EquipmentCard shop grammar for
 * visual consistency. Mounted at the top of MarketPanel, above the funding
 * rounds - see spec section 7's "Market タブ" placement option. All
 * eligibility/cooldown logic is read from data/contracts.ts and
 * engine/validation.ts; this component only decides what to render.
 */
export default function ContractPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const state = useGameStore((s) => s);
  const claimPrototypeContract = useGameStore((s) => s.claimPrototypeContract);
  const claimDataCleaningContract = useGameStore((s) => s.claimDataCleaningContract);

  const prototypeClaimed = state.prototypeContractClaimed;
  const prototypeEligible = isPrototypeContractEligible(state);

  const dataContractEligible = isDataCleaningContractEligible(state);
  const dataContractCooldown = getDataCleaningContractCooldownRemaining(state);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("contracts.title")}</h3>
        <p className="text-[11px] text-ink-dim">{t("contracts.description")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EquipmentCard
          icon="model"
          name={t("contracts.prototype.name")}
          description={prototypeClaimed ? undefined : t("contracts.prototype.condition")}
          locked={!prototypeClaimed && !prototypeEligible}
          lockReason={!prototypeClaimed && !prototypeEligible ? t("contracts.ineligibleReason") : undefined}
          glow={prototypeEligible && !prototypeClaimed}
          stats={[{ label: "LOSS ≤", value: BALANCE.prototypeContractLossThreshold.toFixed(2) }]}
          statusBadge={
            prototypeClaimed ? (
              <Badge tone="green" icon="●">
                {t("contracts.executed")}
              </Badge>
            ) : prototypeEligible ? (
              <Badge tone="cyan" icon="✓">
                {t("contracts.eligible")}
              </Badge>
            ) : undefined
          }
          priceLabel={fmt.cash(BALANCE.prototypeContractReward)}
          actionLabel={prototypeClaimed ? undefined : t("contracts.execute")}
          onAction={prototypeClaimed ? undefined : () => claimPrototypeContract()}
          actionDisabled={!prototypeEligible}
        />

        <EquipmentCard
          icon="finance"
          name={t("contracts.dataCleaning.name")}
          description={t("contracts.dataCleaning.condition", { cost: BALANCE.dataContractCleanDataCost })}
          locked={!dataContractEligible}
          lockReason={
            !dataContractEligible
              ? dataContractCooldown > 0
                ? t("contracts.cooldownRemaining", { seconds: Math.ceil(dataContractCooldown) })
                : t("contracts.ineligibleReason")
              : undefined
          }
          glow={dataContractEligible}
          stats={[
            { label: "COST", value: `${BALANCE.dataContractCleanDataCost}TB` },
            { label: "COUNT", value: state.dataContractClaimCount },
          ]}
          priceLabel={fmt.cash(BALANCE.dataContractReward)}
          actionLabel={t("contracts.execute")}
          onAction={() => claimDataCleaningContract()}
          actionDisabled={!dataContractEligible}
        />
      </div>
    </section>
  );
}
