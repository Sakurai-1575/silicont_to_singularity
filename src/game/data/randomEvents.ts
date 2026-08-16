import type { RandomEventSpec } from "../types/events";

/**
 * Progression Expansion Sprint (spec section 6: "ランダムイベント"). Fixed
 * roster of 5 good + 5 bad events; engine/randomEvents.ts rolls a per-tick
 * chance calibrated to BALANCE.eventFrequencySeconds (average ~7.5min at the
 * default 450s, matching the spec's "5〜10分に一度"), picks good/bad 50/50,
 * then picks uniformly within that half. See engine/randomEvents.ts for each
 * event's actual (state-relative, so it scales across early/late game)
 * numeric effect.
 */
export const RANDOM_EVENTS: RandomEventSpec[] = [
  { id: "research_grant", kind: "good", name: "Research Grant" },
  { id: "university_partnership", kind: "good", name: "University Partnership" },
  { id: "viral_growth", kind: "good", name: "Viral Growth" },
  { id: "vc_interest", kind: "good", name: "VC Interest" },
  { id: "open_source_breakthrough", kind: "good", name: "Open Source Breakthrough" },
  { id: "gpu_failure", kind: "bad", name: "GPU Failure" },
  { id: "cooling_failure", kind: "bad", name: "Cooling Failure" },
  { id: "data_leak", kind: "bad", name: "Data Leak" },
  { id: "power_spike", kind: "bad", name: "Power Spike" },
  { id: "pr_incident", kind: "bad", name: "PR Incident" },
];

export const GOOD_RANDOM_EVENTS = RANDOM_EVENTS.filter((e) => e.kind === "good");
export const BAD_RANDOM_EVENTS = RANDOM_EVENTS.filter((e) => e.kind === "bad");

export const RANDOM_EVENT_MAP: Record<string, RandomEventSpec> = Object.fromEntries(
  RANDOM_EVENTS.map((spec) => [spec.id, spec]),
);

export function getRandomEventSpec(id: string): RandomEventSpec | undefined {
  return RANDOM_EVENT_MAP[id];
}
