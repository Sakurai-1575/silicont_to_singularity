import { useEffect } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useUiStore } from "./uiStore";
import { saveGame } from "../game/utils/save";

/**
 * Drives the 1-tick-per-second simulation loop (spec section 4: "1 tick =
 * 1秒") and wires up the "page leave" autosave trigger (spec 25.1). Mount
 * this once near the root of the app (see app/App.tsx) - it does not render
 * anything itself.
 *
 * Sprint 1 addition: the interval only calls tick() while uiStore.screen is
 * "game" - otherwise game time (and burn rate, training progress, etc.)
 * would silently advance while the player is sitting on the Title screen.
 */
export function useGameLoop(): void {
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (useUiStore.getState().screen === "game") {
        useGameStore.getState().tick();
      }
    }, 1000);

    const handleBeforeUnload = () => {
      if (useUiStore.getState().screen === "game") {
        saveGame(useGameStore.getState());
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
