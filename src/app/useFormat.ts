import { useSettingsStore } from "./settingsStore";
import { formatNumber, formatNumberFull, formatCash, formatCashFull } from "../game/utils/format";

/**
 * Returns number/cash formatters bound to the current Settings >
 * 数値表記 (short vs full-digit) preference, so panels don't each have to
 * branch on the setting themselves - they just call `fmt.number(x)` /
 * `fmt.cash(x)`. Both branches call into game/utils/format.ts; no formatting
 * math lives in this hook itself.
 */
export function useNumberFormat() {
  const mode = useSettingsStore((s) => s.numberFormat);
  const isFull = mode === "full";
  return {
    number: isFull ? formatNumberFull : formatNumber,
    cash: isFull ? formatCashFull : formatCash,
  };
}
