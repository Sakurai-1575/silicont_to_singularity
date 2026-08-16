/**
 * Central random-number source for all probability-driven events (meltdown
 * GPU destruction, Loss Explosion, etc). Routing every random roll through
 * this module means engine code never calls Math.random() directly, which
 * keeps probability logic testable/mockable in one place.
 */

export type RandomSource = () => number;

let source: RandomSource = Math.random;

/** Swap the underlying random source (e.g. a seeded PRNG for tests). */
export function setRandomSource(fn: RandomSource): void {
  source = fn;
}

/** Restore the default Math.random-based source. */
export function resetRandomSource(): void {
  source = Math.random;
}

/** Returns true with probability `chance` (0..1). */
export function rollChance(chance: number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  return source() < chance;
}

/** Pick a uniformly random element from a non-empty array. */
export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error("pickRandom: cannot pick from an empty array");
  }
  const index = Math.floor(source() * items.length);
  return items[Math.min(index, items.length - 1)];
}

/** Generate a short unique id (instance ids for owned hardware, event ids, etc). */
export function generateId(prefix = "id"): string {
  const rand = Math.floor(source() * 1e9)
    .toString(36)
    .padStart(6, "0");
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
