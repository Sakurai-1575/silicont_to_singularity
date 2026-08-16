import { useUiStore } from "./uiStore";
import { useSettingsStore } from "./settingsStore";
import { useGameLoop } from "./useGameLoop";
import { useTimeControlShortcuts } from "./useTimeControlShortcuts";
import { TitleScreen, GameScreen } from "../components/screens";
import ClearScreen from "../components/screens/ClearScreen";
import BankruptcyScreen from "../components/screens/BankruptcyScreen";
import { ModalRoot } from "../components/modals";
import GlobalToast from "../components/GlobalToast";
import CelebrationBanner from "../components/CelebrationBanner";
import AchievementWatcher from "../components/AchievementWatcher";
import ObjectiveWatcher from "../components/ObjectiveWatcher";
import EndStateWatcher from "../components/EndStateWatcher";

/**
 * App root: routes between the Title screen and the in-game screen (see
 * app/uiStore.ts), and mounts the modal layer + the 1-tick-per-second game
 * loop once regardless of which screen is active. The Clear/Bankruptcy
 * overlays and their watchers (Feature Completion Sprint sections 3/4) only
 * make sense once a game is actually running, so they're gated on
 * screen === "game" alongside GlobalToast.
 */
export default function App() {
  useGameLoop();
  useTimeControlShortcuts();
  const screen = useUiStore((s) => s.screen);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const showClearScreen = useUiStore((s) => s.showClearScreen);
  const showBankruptcyScreen = useUiStore((s) => s.showBankruptcyScreen);

  return (
    <div className={`min-h-screen bg-void text-ink-primary ${animationsEnabled ? "" : "no-animate"}`}>
      {screen === "title" ? <TitleScreen /> : <GameScreen />}
      {screen === "game" && (
        <>
          <GlobalToast />
          <CelebrationBanner />
          <AchievementWatcher />
          <ObjectiveWatcher />
          <EndStateWatcher />
          {showClearScreen && <ClearScreen />}
          {showBankruptcyScreen && <BankruptcyScreen />}
        </>
      )}
      <ModalRoot />
      <div className="crt-scanlines" />
      <div className="crt-vignette" />
    </div>
  );
}
