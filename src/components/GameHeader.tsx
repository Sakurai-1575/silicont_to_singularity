import { useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useUiStore } from "../app/uiStore";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { formatPercent } from "../game/utils/format";
import { StatCard, GameButton, Badge } from "./ui";
import { playSound } from "../game/services/audio";
import TimeControlBar from "./TimeControlBar";

/**
 * Top bar shown throughout the game screen (spec: Game Time / Cash /
 * Valuation / Equity / Alert count / manual save / return-to-title). Always
 * mounted above the 3-column layout - see components/screens/GameScreen.tsx.
 */
export default function GameHeader() {
  const t = useT();
  const fmt = useNumberFormat();
  const goToTitle = useUiStore((s) => s.goToTitle);
  const openModal = useUiStore((s) => s.openModal);

  const openClearScreen = useUiStore((s) => s.openClearScreen);
  const openBankruptcyScreen = useUiStore((s) => s.openBankruptcyScreen);

  const cash = useGameStore((s) => s.cash);
  const burnRate = useGameStore((s) => s.burnRate);
  const valuation = useGameStore((s) => s.valuation);
  const equity = useGameStore((s) => s.equity);
  const warnings = useGameStore((s) => s.warnings);
  const isBankrupt = useGameStore((s) => s.isBankrupt);
  const isGameCleared = useGameStore((s) => s.isGameCleared);
  const saveToSlot = useGameStore((s) => s.saveToSlot);

  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    saveToSlot(0);
    playSound("save");
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  const cashDecreasing = burnRate > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-borderbright bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-3 py-2">
        <span className="mr-2 hidden font-display text-[10px] text-cyan-neon sm:inline">{t("common.appTitle")}</span>

        <div className="flex flex-wrap items-center gap-1.5">
          <TimeControlBar />
          <StatCard
            label={t("resource.cash")}
            value={fmt.cash(cash)}
            tone={isBankrupt ? "danger" : cashDecreasing ? "warn" : "green"}
          />
          <StatCard label={t("resource.valuation")} value={fmt.cash(valuation)} tone="cyan" />
          <StatCard
            label={t("resource.equity")}
            value={formatPercent(equity, 1)}
            tone={equity < 34 ? "danger" : equity < 50 ? "warn" : "neutral"}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isBankrupt && (
            <button
              type="button"
              onClick={openBankruptcyScreen}
              className="animate-pulse-glow border border-danger bg-danger-dim/30 px-2 py-1 text-[10px] uppercase tracking-wide text-danger"
            >
              ⚠ {t("bankruptcy.title")}
            </button>
          )}
          {isGameCleared && (
            <button
              type="button"
              onClick={openClearScreen}
              className="border border-green-neon bg-green-dim/20 px-2 py-1 text-[10px] uppercase tracking-wide text-green-neon"
            >
              🎉 {t("clear.title")}
            </button>
          )}
          {warnings.length > 0 && (
            <Badge tone="warn" icon="⚠">
              {t("header.alerts")} {warnings.length}
            </Badge>
          )}
          <GameButton size="sm" variant={justSaved ? "primary" : "default"} onClick={handleSave}>
            {justSaved ? t("header.manualSaveDone") : t("header.manualSave")}
          </GameButton>
          <GameButton size="sm" variant="ghost" onClick={() => openModal("help")} title={t("help.title")}>
            ❔ {t("help.title")}
          </GameButton>
          <GameButton size="sm" variant="ghost" onClick={() => openModal("achievements")} title={t("achievements.title")}>
            🏆 {t("achievements.title")}
          </GameButton>
          <GameButton size="sm" variant="ghost" onClick={() => openModal("settings")} title={t("title.settings")}>
            ⚙ {t("title.settings")}
          </GameButton>
          <GameButton size="sm" variant="ghost" onClick={goToTitle}>
            {t("header.backToTitle")}
          </GameButton>
        </div>
      </div>
    </header>
  );
}
