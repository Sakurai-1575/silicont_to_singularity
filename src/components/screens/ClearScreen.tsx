import { useState, type FocusEvent } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useUiStore } from "../../app/uiStore";
import { useSettingsStore } from "../../app/settingsStore";
import { useT } from "../../game/i18n";
import { useNumberFormat } from "../../app/useFormat";
import { getDisplayName } from "../../game/i18n/dataNames";
import { formatDuration } from "../../game/utils/format";
import { playSound } from "../../game/services/audio";
import { GameButton, PixelFrame, StatCard } from "../ui";

/**
 * Game Clear screen (Feature Completion Sprint section 3). Rendered as a
 * full-screen overlay from app/App.tsx (NOT through ModalRoot - see
 * app/uiStore.ts's showClearScreen doc comment) whenever
 * useUiStore.showClearScreen is true. Shown automatically once the run's
 * isGameCleared transitions to true (see components/EndStateWatcher.tsx),
 * and re-openable afterward from GameHeader while isGameCleared stays true -
 * dismissing it ("Continue") never stops the simulation, it just hides the
 * overlay.
 */
export default function ClearScreen() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);
  const closeClearScreen = useUiStore((s) => s.closeClearScreen);
  const goToTitle = useUiStore((s) => s.goToTitle);
  const openModal = useUiStore((s) => s.openModal);
  const hasSeenTutorial = useSettingsStore((s) => s.hasSeenTutorial);

  const state = useGameStore((s) => s);
  const resetGame = useGameStore((s) => s.resetGame);
  const exportSave = useGameStore((s) => s.exportSave);

  const [exportText, setExportText] = useState<string | null>(null);

  const bestModel = state.completedModels.reduce<(typeof state.completedModels)[number] | null>((best, m) => {
    if (!best || m.qualityScore > best.qualityScore) return m;
    return best;
  }, null);

  const handleNewGame = () => {
    resetGame();
    closeClearScreen();
    if (!hasSeenTutorial) {
      openModal("tutorial");
    }
  };

  const handleTitle = () => {
    closeClearScreen();
    goToTitle();
  };

  const handleExport = () => {
    setExportText(exportSave());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/85 p-4">
      <PixelFrame
        as="section"
        className="w-full max-w-2xl animate-flash-in border-green-neon bg-panel-raised p-5 shadow-[0_0_40px_rgba(76,255,163,0.25)]"
      >
        <h1 className="animate-pulse-glow text-center font-display text-lg text-green-neon sm:text-xl">
          {t("clear.title")}
        </h1>
        <p className="mt-2 text-center text-xs text-ink-dim">{t("clear.subtitle")}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard label={t("clear.stats.playtime")} value={formatDuration(state.gameTimeSeconds)} />
          <StatCard label={t("resource.valuation")} value={fmt.cash(state.valuation)} tone="cyan" />
          <StatCard label={t("resource.cash")} value={fmt.cash(state.cash)} />
          <StatCard label={t("resource.equity")} value={`${state.equity.toFixed(1)}%`} />
          <StatCard label={t("clear.stats.completedModels")} value={state.completedModels.length} />
          <StatCard
            label={t("clear.stats.bestQuality")}
            value={bestModel ? bestModel.qualityScore.toFixed(1) : t("common.none")}
          />
          <StatCard label={t("clear.stats.maxCompute")} value={`${fmt.number(state.maxTotalComputeReached)} ${t("units.tflops")}`} />
          <StatCard label={t("clear.stats.finalFacility")} value={getDisplayName("facility", state.facilityId, language)} />
          <StatCard label={t("clear.stats.bestModel")} value={bestModel ? getDisplayName("model", bestModel.specId, language) : t("common.none")} />
          <StatCard label={t("clear.stats.enterpriseDeliveries")} value={state.completedEnterpriseDealIds.length} />
          <StatCard label={t("clear.stats.fundingRounds")} value={state.fundingHistory.length} />
          <StatCard label={t("clear.stats.nearBankruptcies")} value={state.debtEnteredCount} />
        </div>

        {exportText !== null && (
          <textarea
            readOnly
            value={exportText}
            onFocus={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.select()}
            className="mt-3 h-20 w-full resize-none border border-borderdim bg-inset p-1.5 font-mono text-[10px] text-ink-dim"
          />
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <GameButton
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              playSound("uiClick");
              closeClearScreen();
            }}
          >
            {t("clear.continueButton")}
          </GameButton>
          <GameButton variant="default" size="sm" className="w-full" onClick={handleExport}>
            {t("clear.exportButton")}
          </GameButton>
          <GameButton variant="default" size="sm" className="w-full" onClick={handleNewGame}>
            {t("clear.newGameButton")}
          </GameButton>
          <GameButton variant="primary" size="sm" className="w-full" onClick={handleTitle}>
            {t("clear.titleButton")}
          </GameButton>
        </div>
      </PixelFrame>
    </div>
  );
}
