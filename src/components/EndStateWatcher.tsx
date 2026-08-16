import { useEffect, useRef } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useUiStore } from "../app/uiStore";

/**
 * Mounted once alongside GameScreen (see app/App.tsx). Watches
 * isGameCleared/isBankrupt for a false->true transition and opens the
 * corresponding full-screen overlay exactly once per transition (see
 * components/screens/ClearScreen.tsx / BankruptcyScreen.tsx). A save/load
 * that lands directly on an already-true value does NOT re-trigger the
 * overlay on mount (it only reacts to a live transition), so loading an
 * already-cleared or already-bankrupt save just drops the player straight
 * into the game screen - they can still reopen either screen manually via
 * GameHeader.
 */
export default function EndStateWatcher() {
  const isGameCleared = useGameStore((s) => s.isGameCleared);
  const isBankrupt = useGameStore((s) => s.isBankrupt);
  const openClearScreen = useUiStore((s) => s.openClearScreen);
  const openBankruptcyScreen = useUiStore((s) => s.openBankruptcyScreen);

  const prevCleared = useRef(isGameCleared);
  const prevBankrupt = useRef(isBankrupt);

  useEffect(() => {
    if (isGameCleared && !prevCleared.current) {
      openClearScreen();
    }
    prevCleared.current = isGameCleared;
  }, [isGameCleared, openClearScreen]);

  useEffect(() => {
    if (isBankrupt && !prevBankrupt.current) {
      openBankruptcyScreen();
    }
    prevBankrupt.current = isBankrupt;
  }, [isBankrupt, openBankruptcyScreen]);

  return null;
}
