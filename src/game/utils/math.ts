/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(`clamp: min (${min}) must be <= max (${max})`);
  }
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between a and b at t (0..1, not clamped). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Round to a fixed number of decimal places (avoids float noise in stored state). */
export function roundTo(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** True if `value` is a finite number (guards against NaN/Infinity leaking into state). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
