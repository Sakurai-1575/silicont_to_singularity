import { useEffect, useState } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useUiStore } from "../../app/uiStore";
import { useSettingsStore } from "../../app/settingsStore";
import { useT } from "../../game/i18n";
import { hasAnySave, loadGame } from "../../game/utils/save";
import { playBgm } from "../../game/services/audio";
import { GameButton } from "../ui";

/**
 * First screen shown on launch (spec: Title screen with New Game / Continue
 * / Load Game / Settings / Credits / Version). "Continue" always targets
 * save slot 0 (the autosave slot) - the full 3-slot picker lives in
 * SaveLoadModal, opened via "Load Game".
 */
export default function TitleScreen() {
  const t = useT();
  const goToGame = useUiStore((s) => s.goToGame);
  const openModal = useUiStore((s) => s.openModal);
  const hasSeenTutorial = useSettingsStore((s) => s.hasSeenTutorial);
  const resetGame = useGameStore((s) => s.resetGame);

  const [confirmingNewGame, setConfirmingNewGame] = useState(false);

  useEffect(() => {
    playBgm("title");
  }, []);

  // Re-checked on every render rather than memoized across the component's
  // lifetime, since a Load/Delete in SaveLoadModal can change this while the
  // title screen is still mounted underneath the modal.
  const canContinue = hasAnySave();

  const startFresh = () => {
    resetGame();
    if (!hasSeenTutorial) {
      openModal("tutorial");
    } else {
      goToGame();
    }
  };

  const handleNewGame = () => {
    if (canContinue && !confirmingNewGame) {
      setConfirmingNewGame(true);
      window.setTimeout(() => setConfirmingNewGame(false), 4000);
      return;
    }
    setConfirmingNewGame(false);
    startFresh();
  };

  const handleContinue = () => {
    const state = loadGame(0);
    if (!state) return;
    useGameStore.setState(state);
    goToGame();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-void px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(63,230,224,0.06),transparent_60%)]" />

      <div className="relative flex flex-col items-center">
        <h1 className="font-display text-2xl text-cyan-neon animate-pulse-glow sm:text-3xl">
          {t("common.appTitle")}
        </h1>
        <p className="mt-3 font-body text-xs text-ink-dim sm:text-sm">{t("common.subtitle")}</p>

        <nav className="mt-10 flex w-64 flex-col gap-2.5">
          <GameButton variant="primary" size="md" className="w-full py-2.5" onClick={handleNewGame}>
            {confirmingNewGame ? t("common.confirm") + "?" : t("title.newGame")}
          </GameButton>

          <div className="flex flex-col gap-0.5">
            <GameButton
              size="md"
              className="w-full py-2.5"
              disabled={!canContinue}
              onClick={handleContinue}
              title={canContinue ? undefined : t("title.noSaveHint")}
            >
              {t("title.continue")}
            </GameButton>
            {!canContinue && <span className="text-center text-[10px] text-ink-muted">{t("title.noSaveHint")}</span>}
          </div>

          <GameButton size="md" className="w-full py-2.5" onClick={() => openModal("saveload")}>
            {t("title.loadGame")}
          </GameButton>
          <GameButton size="md" className="w-full py-2.5" onClick={() => openModal("settings")}>
            {t("title.settings")}
          </GameButton>
          <GameButton size="md" className="w-full py-2.5" onClick={() => openModal("credits")}>
            {t("title.credits")}
          </GameButton>
        </nav>

        <p className="mt-10 font-mono text-[10px] text-ink-muted">
          {t("common.version")} 0.1.0 (Sprint 1)
        </p>
      </div>
    </div>
  );
}
