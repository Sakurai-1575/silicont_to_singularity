/**
 * Display-only number formatting. Internal game math always uses plain
 * `number` (spec section 5.1) - these helpers are for UI presentation only
 * and must never be used inside engine/ calculations.
 */

const SUFFIXES: { value: number; suffix: string }[] = [
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
  { value: 1e3, suffix: "K" },
];

/**
 * Format a large number using K/M/B/T abbreviation, e.g. 1_000_000 -> "1.00M".
 * Values below 1000 are shown with up to 2 decimals (no suffix).
 * Negative values are formatted symmetrically (sign preserved).
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  for (const { value: threshold, suffix } of SUFFIXES) {
    if (abs >= threshold) {
      return `${sign}${(abs / threshold).toFixed(2)}${suffix}`;
    }
  }
  return `${sign}${abs.toFixed(2)}`;
}

/**
 * Full-digit alternative to formatNumber (Settings > 数値表記 > 全桁表示),
 * e.g. 1_234_567 -> "1,234,567". Values are rounded to whole numbers since
 * every game quantity this is used for (cash, TB, TFLOPS, RP...) doesn't
 * need sub-unit precision at display time.
 */
export function formatNumberFull(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("en-US");
}

/** Format a cash amount, e.g. 12500 -> "$12.50K". */
export function formatCash(value: number): string {
  return `$${formatNumber(value)}`;
}

/** Full-digit cash amount, e.g. 12500 -> "$12,500". */
export function formatCashFull(value: number): string {
  return `$${formatNumberFull(value)}`;
}

/** Format a $/s rate, e.g. -3.2 -> "-$3.20/s". */
export function formatRate(value: number): string {
  return `${formatCash(value)}/s`;
}

/** Format a percentage from a 0..100 number, e.g. 12.345 -> "12.3%". */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Format a ratio (0..1) as a percentage, e.g. 0.7 -> "70%". */
export function formatRatio(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a Celsius temperature, e.g. 84.2 -> "84.2°C". */
export function formatTemperature(value: number): string {
  return `${value.toFixed(1)}°C`;
}

/** Format a save timestamp (ms since epoch) for the Save/Load UI, e.g. "2026/08/14 21:03". */
export function formatSavedAt(timestampMs: number): string {
  const d = new Date(timestampMs);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format seconds as mm:ss or hh:mm:ss for long durations. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
