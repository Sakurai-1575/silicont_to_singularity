import { useEffect } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useUiStore } from "./uiStore";
import { playSound } from "../game/services/audio";

/**
 * Phase 4 "Company Calendar & Time Control System" (spec section 15):
 * Space = Pause/Resume, 1/2/3 = Normal/Fast/Turbo. Mounted once near the app
 * root (see App.tsx) alongside useGameLoop, active only while a game is
 * actually running (screen === "game") - mirrors useGameLoop's own guard.
 *
 * Ignored while:
 *  - any modal is open (activeModal !== null) - Settings/SaveLoad/Help/etc.
 *    might contain their own inputs, and "Space" toggling Pause underneath
 *    an open dialog would be surprising.
 *  - the Clear/Bankruptcy full-screen takeover is showing.
 *  - focus is inside a text input/textarea/select or any `contenteditable`
 *    element (spec: "入力欄...では誤作動しないようにする") - the Import Save
 *    textarea in SaveLoadModal is the one real text-entry surface in the
 *    game screen today, but this guard is written generically so it stays
 *    correct if more inputs are added later.
 *  - the browser event carries a modifier key (Ctrl/Alt/Meta), so this never
 *    fights a browser/OS shortcut that happens to share a key.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useTimeControlShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (useUiStore.getState().screen !== "game") return;
      if (useUiStore.getState().activeModal !== null) return;
      if (useUiStore.getState().showClearScreen || useUiStore.getState().showBankruptcyScreen) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const setTimeScale = useGameStore.getState().setTimeScale;
      const currentTimeScale = useGameStore.getState().timeScale;

      if (event.code === "Space") {
        event.preventDefault();
        setTimeScale(currentTimeScale === "paused" ? "normal" : "paused");
        playSound("uiClick");
      } else if (event.key === "1") {
        setTimeScale("normal");
        playSound("uiClick");
      } else if (event.key === "2") {
        setTimeScale("fast");
        playSound("uiClick");
      } else if (event.key === "3") {
        setTimeScale("turbo");
        playSound("uiClick");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
