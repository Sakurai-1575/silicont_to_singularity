import { useGameStore } from "../game/store/gameStore";
import { ENTERPRISE_DEALS } from "../game/data/enterpriseDeals";
import { findBestEligibleModel } from "../game/engine/enterprise";
import { useT } from "../game/i18n";
import { useSettingsStore } from "../app/settingsStore";
import { useNumberFormat } from "../app/useFormat";
import { getDisplayName } from "../game/i18n/dataNames";
import { Badge, EquipmentCard } from "./ui";

/**
 * Enterprise License deal list (Feature Completion Sprint section 1),
 * restyled as a card grid for the UI Professional Polish Sprint's "market
 * board" treatment (section 9) - reuses EquipmentCard so it visually reads
 * as the same "shop grammar" as Hardware's GPU cards, just with different
 * stats/badges. All eligibility/reward logic is read from
 * engine/enterprise.ts - this component only decides what badge/button
 * state to render from the result.
 */
export default function EnterprisePanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);

  const completedModels = useGameStore((s) => s.completedModels);
  const completedEnterpriseDealIds = useGameStore((s) => s.completedEnterpriseDealIds);
  const deliverEnterpriseDeal = useGameStore((s) => s.deliverEnterpriseDeal);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[11px] uppercase tracking-widest text-orange-neon">{t("enterprise.title")}</h3>
        <p className="text-[11px] text-ink-dim">{t("enterprise.description")}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENTERPRISE_DEALS.map((deal) => {
          const delivered = completedEnterpriseDealIds.includes(deal.id);
          const eligibleModel = findBestEligibleModel(completedModels, deal);
          return (
            <EquipmentCard
              key={deal.id}
              icon="finance"
              name={getDisplayName("enterpriseDeal", deal.id, language)}
              description={
                eligibleModel && !delivered
                  ? `${t("enterprise.eligibleModel")}: ${eligibleModel.name}`
                  : !eligibleModel && !delivered
                    ? t("enterprise.ineligibleReason")
                    : undefined
              }
              locked={!eligibleModel && !delivered}
              lockReason={!eligibleModel && !delivered ? t("enterprise.notEligible") : undefined}
              glow={!!eligibleModel && !delivered}
              stats={[
                { label: "PARAMS", value: fmt.number(deal.requiredParameters) },
                { label: "MAX LOSS", value: deal.maxLoss.toFixed(2) },
              ]}
              statusBadge={
                delivered ? (
                  <Badge tone="green" icon="●">
                    {t("enterprise.delivered")}
                  </Badge>
                ) : eligibleModel ? (
                  <Badge tone="cyan" icon="✓">
                    {t("enterprise.eligible")}
                  </Badge>
                ) : undefined
              }
              priceLabel={fmt.cash(deal.rewardCash)}
              actionLabel={delivered ? undefined : t("enterprise.deliver")}
              onAction={delivered ? undefined : () => deliverEnterpriseDeal(deal.id)}
              actionDisabled={!eligibleModel}
            />
          );
        })}
      </div>
    </section>
  );
}
