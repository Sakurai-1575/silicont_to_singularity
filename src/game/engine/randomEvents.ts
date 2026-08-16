import type { GameState } from "../types/game";
import type { RandomEventId } from "../types/events";
import { GOOD_RANDOM_EVENTS, BAD_RANDOM_EVENTS } from "../data/randomEvents";
import { BALANCE } from "../data/balance";
import { rollChance, pickRandom } from "../utils/random";
import { clampReputation, reputationLossFromDataIncident } from "./reputation";

/**
 * Random event system (Progression Expansion Sprint spec section 6). Called
 * once per tick from engine/tick.ts; rolls a per-tick chance calibrated to
 * BALANCE.eventFrequencySeconds (average interval, not a fixed timer - an
 * exponential distribution matches the spec's "5〜10分に一度" better than a
 * rigid countdown, and needs no new persisted state). Every effect is
 * computed relative to CURRENT state (percentages of cash/data/etc, not flat
 * numbers) so events stay meaningful in both early and late game.
 *
 * Returns a patch the caller merges into its in-progress next-state object,
 * plus a ready-to-log Japanese message and the event id (so
 * GlobalToast.tsx / future choice-based events can key off it). `kind` isn't
 * returned separately - callers that need it can look it up via
 * getRandomEventSpec(outcome.id).
 */
export type RandomEventOutcome = {
  id: RandomEventId;
  message: string;
  patch: Partial<GameState>;
};

export function rollRandomEvent(state: GameState): RandomEventOutcome | null {
  const perTickChance = BALANCE.eventFrequencySeconds > 0 ? 1 / BALANCE.eventFrequencySeconds : 0;
  if (!rollChance(perTickChance)) return null;

  const isGood = rollChance(0.5);
  const pool = isGood ? GOOD_RANDOM_EVENTS : BAD_RANDOM_EVENTS;
  const spec = pickRandom(pool);

  switch (spec.id) {
    case "research_grant": {
      const reward = Math.max(8000, state.cash * 0.04);
      return {
        id: spec.id,
        message: `Research Grantを獲得しました（+$${reward.toFixed(0)}）。`,
        patch: { cash: state.cash + reward },
      };
    }
    case "university_partnership": {
      const rpReward = 15;
      return {
        id: spec.id,
        message: `University Partnershipが成立しました（研究ポイント +${rpReward}）。`,
        patch: { researchPoints: state.researchPoints + rpReward, reputation: clampReputation(state.reputation + 2) },
      };
    }
    case "viral_growth": {
      const subGain = Math.max(3, state.subscribers * 0.15);
      const userGain = Math.max(100, state.users * 0.15);
      return {
        id: spec.id,
        message: `Viral Growthが発生しました（購読者 +${subGain.toFixed(0)}、ユーザー +${userGain.toFixed(0)}）。`,
        patch: { subscribers: state.subscribers + subGain, users: state.users + userGain },
      };
    }
    case "vc_interest": {
      const reward = Math.max(10000, state.valuation * 0.01);
      return {
        id: spec.id,
        message: `VC Interest（出資への関心）により資金を獲得しました（+$${reward.toFixed(0)}、持分の希薄化なし）。`,
        patch: { cash: state.cash + reward },
      };
    }
    case "open_source_breakthrough": {
      const rpReward = 25;
      return {
        id: spec.id,
        message: `Open Source Breakthroughが発生しました（研究ポイント +${rpReward}）。`,
        patch: { researchPoints: state.researchPoints + rpReward, brand: Math.min(BALANCE.brandMaxValue, state.brand + 0.15) },
      };
    }
    case "gpu_failure": {
      if (state.ownedGpus.length > 0) {
        const destroyed = pickRandom(state.ownedGpus);
        return {
          id: spec.id,
          message: `GPU Failureが発生しました（GPUユニットを1台失いました）。`,
          patch: { ownedGpus: state.ownedGpus.filter((g) => g.instanceId !== destroyed.instanceId) },
        };
      }
      const penalty = Math.min(state.cash, Math.max(1000, state.cash * 0.02));
      return {
        id: spec.id,
        message: `GPU Failureが発生しました（緊急対応費 -$${penalty.toFixed(0)}）。`,
        patch: { cash: state.cash - penalty },
      };
    }
    case "cooling_failure": {
      if (state.ownedCooling.length > 0) {
        const destroyed = pickRandom(state.ownedCooling);
        return {
          id: spec.id,
          message: `Cooling Failureが発生しました（冷却設備を1台失いました）。`,
          patch: { ownedCooling: state.ownedCooling.filter((c) => c.instanceId !== destroyed.instanceId) },
        };
      }
      const penalty = Math.min(state.cash, Math.max(1000, state.cash * 0.02));
      return {
        id: spec.id,
        message: `Cooling Failureが発生しました（緊急対応費 -$${penalty.toFixed(0)}）。`,
        patch: { cash: state.cash - penalty },
      };
    }
    case "data_leak": {
      const lost = state.cleanData * 0.2;
      return {
        id: spec.id,
        message: `Data Leakが発生しました（整備済みデータ -${lost.toFixed(1)}TB、信頼低下）。`,
        patch: {
          cleanData: Math.max(0, state.cleanData - lost),
          reputation: clampReputation(state.reputation - reputationLossFromDataIncident()),
        },
      };
    }
    case "power_spike": {
      const penalty = Math.min(state.cash, Math.max(1500, state.cash * 0.03));
      return {
        id: spec.id,
        message: `Power Spikeが発生しました（修理費 -$${penalty.toFixed(0)}）。`,
        patch: { cash: state.cash - penalty },
      };
    }
    case "pr_incident": {
      return {
        id: spec.id,
        message: `PR Incidentが発生しました（評判低下）。`,
        patch: {
          reputation: clampReputation(state.reputation - 6),
          brand: Math.max(0, state.brand - 0.1),
        },
      };
    }
    default:
      return null;
  }
}
