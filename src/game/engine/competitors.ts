import type { Competitor } from "../types/competitors";
import { BALANCE } from "../data/balance";
import { rollChance, pickRandom } from "../utils/random";

/**
 * Simplified competitor-company simulation (Progression Expansion Sprint
 * spec section 9). Runs once every COMPETITOR_TICK_INTERVAL_SECONDS (not
 * every game tick - see engine/tick.ts's gating on CompetitorState.
 * lastCompetitorSimAt) so the 4 rivals' activity reads as discrete "news"
 * events rather than a smooth background drift. Each competitor
 * independently rolls whether it acts this step (scaled by its own
 * aggressiveness and BALANCE.competitorAggressivenessMultiplier), then picks
 * one of 4 flavor actions - only marketShare-grabbing actions actually
 * contest the player's own MarketState.marketShare (spec: "プレイヤーへの影響:
 * 収益・市場シェア・評判").
 */
export const COMPETITOR_TICK_INTERVAL_SECONDS = 60;

export type CompetitorSimResult = {
  competitors: Competitor[];
  /** Always <= 0 - the amount to subtract from the player's own MarketState.marketShare this step. */
  playerMarketShareDelta: number;
  logMessages: string[];
};

type CompetitorActionType = "launch_model" | "raise_funding" | "market_share_grab" | "enterprise_win";

const ACTION_TYPES: CompetitorActionType[] = ["launch_model", "raise_funding", "market_share_grab", "enterprise_win"];

const ACTION_MESSAGE_JA: Record<CompetitorActionType, (name: string) => string> = {
  launch_model: (name) => `${name}が新モデルを発表しました。`,
  raise_funding: (name) => `${name}が新たな資金調達を実施しました。`,
  market_share_grab: (name) => `${name}が積極的な営業攻勢で市場シェアを拡大しました。`,
  enterprise_win: (name) => `${name}がEnterprise案件を獲得しました。`,
};

export function simulateCompetitorsTick(competitors: Competitor[]): CompetitorSimResult {
  let playerMarketShareDelta = 0;
  const logMessages: string[] = [];

  const nextCompetitors = competitors.map((c) => {
    const actsThisStep = rollChance(Math.min(1, c.aggressiveness * 0.4 * BALANCE.competitorAggressivenessMultiplier));
    if (!actsThisStep) return c;

    const action = pickRandom(ACTION_TYPES);
    let marketShare = c.marketShare;
    let reputation = c.reputation;

    if (action === "launch_model" || action === "market_share_grab") {
      const gain = (action === "launch_model" ? 1.2 : 0.6) * c.aggressiveness;
      marketShare = Math.min(100, marketShare + gain);
      playerMarketShareDelta -= gain * 0.35;
    } else if (action === "raise_funding") {
      reputation = Math.min(100, reputation + 1);
    } else if (action === "enterprise_win") {
      reputation = Math.min(100, reputation + 1.5);
      playerMarketShareDelta -= 0.15;
    }

    logMessages.push(ACTION_MESSAGE_JA[action](c.name));
    return { ...c, marketShare, reputation };
  });

  return { competitors: nextCompetitors, playerMarketShareDelta, logMessages };
}
