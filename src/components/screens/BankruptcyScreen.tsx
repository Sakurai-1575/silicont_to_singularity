import { useState, type FocusEvent } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useUiStore } from "../../app/uiStore";
import { useSettingsStore } from "../../app/settingsStore";
import { useT } from "../../game/i18n";
import { useNumberFormat } from "../../app/useFormat";
import { formatDuration } from "../../game/utils/format";
import { canRaiseFunding } from "../../game/engine/valuation";
import { FUNDING_ROUNDS } from "../../game/types/finance";
import { GameButton, PixelFrame, StatCard, GameActionButton } from "../ui";

/**
 * Bankruptcy / Game Over screen (Feature Completion Sprint section 4).
 * Rendered as a full-screen overlay from app/App.tsx whenever
 * useUiStore.showBankruptcyScreen is true - shown automatically the moment
 * isBankrupt transitions to true (see components/EndStateWatcher.tsx) and
 * re-openable afterward via GameHeader's persistent bankruptcy indicator.
 * Funding is explicitly allowed while bankrupt (spec 16.2) so the recovery
 * CTA buttons call raiseFunding directly from here.
 */
export default function BankruptcyScreen() {
  const t = useT();
  const fmt = useNumberFormat();
  const closeBankruptcyScreen = useUiStore((s) => s.closeBankruptcyScreen);
  const goToTitle = useUiStore((s) => s.goToTitle);
  const hasSeenTutorial = useSettingsStore((s) => s.hasSeenTutorial);
  const openModal = useUiStore((s) => s.openModal);

  const state = useGameStore((s) => s);
  const resetGame = useGameStore((s) => s.resetGame);
  const exportSave = useGameStore((s) => s.exportSave);
  const raiseFunding = useGameStore((s) => s.raiseFunding);

  const [exportText, setExportText] = useState<string | null>(null);

  const bestModel = state.completedModels.reduce<(typeof state.completedModels)[number] | null>((best, m) => {
    if (!best || m.qualityScore > best.qualityScore) return m;
    return best;
  }, null);

  const anyFundingViable = FUNDING_ROUNDS.some((r) => canRaiseFunding(state.equity, r.type));

  const handleReset = () => {
    resetGame();
    closeBankruptcyScreen();
    if (!hasSeenTutorial) {
      openModal("tutorial");
    }
  };

  const handleTitle = () => {
    closeBankruptcyScreen();
    goToTitle();
  };

  const handleExport = () => {
    setExportText(exportSave());
  };

  const handleRaise = (roundType: (typeof FUNDING_ROUNDS)[number]["type"]) => {
    const result = raiseFunding(roundType);
    if (result.success) {
      closeBankruptcyScreen();
    }
    return result;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/90 p-4">
      <PixelFrame
        as="section"
        className="w-full max-w-xl animate-flash-in border-danger bg-panel-raised p-5 shadow-[0_0_40px_rgba(255,77,109,0.3)]"
      >
        <h1 className="text-center font-display text-lg text-danger sm:text-xl">{t("bankruptcy.title")}</h1>
        <p className="mt-2 text-center text-xs text-ink-dim">{t("bankruptcy.reason")}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard label={t("clear.stats.playtime")} value={formatDuration(state.gameTimeSeconds)} tone="danger" />
          <StatCard label={t("resource.cash")} value={fmt.cash(state.cash)} tone="danger" />
          <StatCard label={t("bankruptcy.debtSeconds")} value={`${state.maxSecondsInDebtReached}s`} tone="danger" />
          <StatCard label={t("resource.valuation")} value={fmt.cash(state.valuation)} />
          <StatCard label={t("resource.equity")} value={`${state.equity.toFixed(1)}%`} />
          <StatCard
            label={t("bankruptcy.lastModel")}
            value={bestModel ? bestModel.name : t("common.none")}
          />
        </div>

        <div className="mt-4 border-t border-borderdim pt-3">
          {anyFundingViable ? (
            <>
              <p className="mb-2 text-xs text-ink-primary">{t("bankruptcy.recoveryPossible")}</p>
              <div className="flex flex-wrap gap-2">
                {FUNDING_ROUNDS.filter((r) => canRaiseFunding(state.equity, r.type)).map((round) => (
                  <GameActionButton
                    key={round.type}
                    size="sm"
                    variant="primary"
                    label={`${round.label} (${t("market.raise")})`}
                    onAction={() => handleRaise(round.type)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-danger">{t("bankruptcy.recoveryImpossible")}</p>
          )}
        </div>

        {exportText !== null && (
          <textarea
            readOnly
            value={exportText}
            onFocus={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.select()}
            className="mt-3 h-20 w-full resize-none border border-borderdim bg-inset p-1.5 font-mono text-[10px] text-ink-dim"
          />
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <GameButton variant="default" size="sm" className="w-full" onClick={handleExport}>
            {t("clear.exportButton")}
          </GameButton>
          <GameButton variant="danger" size="sm" className="w-full" onClick={handleReset}>
            {t("saveload.resetGame")}
          </GameButton>
          <GameButton variant="ghost" size="sm" className="w-full" onClick={handleTitle}>
            {t("clear.titleButton")}
          </GameButton>
        </div>
      </PixelFrame>
    </div>
  );
}
