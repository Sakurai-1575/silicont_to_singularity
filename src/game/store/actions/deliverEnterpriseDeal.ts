import type { Get, Set } from "./types";
import type { ActionResult } from "../../types/game";
import { ok } from "../../types/game";
import { validateDeliverEnterpriseDeal } from "../../engine/validation";
import { getEnterpriseDeal } from "../../data/enterpriseDeals";
import { findBestEligibleModel, calculateEnterpriseReward } from "../../engine/enterprise";
import { getSalesEffectMultiplier } from "../../engine/staffEffects";
import { getEnterpriseSalesDepartmentBonus } from "../../engine/departmentEffects";
import { getCompanyStrategyMultiplier } from "../../engine/companyStrategy";
import { clampReputation, reputationGainFromEnterpriseDeal } from "../../engine/reputation";
import { appendEvent } from "../slices/eventSlice";
import { saveGame } from "../../utils/save";
import { playSound } from "../../services/audio";

/**
 * Deliver Enterprise Deal button (Feature Completion Sprint section 1).
 * Follows the same validate -> update -> log -> save pattern as
 * deployModel.ts. The delivered deal id is recorded in
 * completedEnterpriseDealIds so it can never be delivered again; the
 * CompletedModel used to satisfy it is left completely untouched (not
 * consumed, not un-deployed).
 */
export function deliverEnterpriseDeal(get: Get, set: Set, dealId: string): ActionResult<void> {
  const state = get();
  const result = validateDeliverEnterpriseDeal(state, dealId);
  if (!result.success) return result;

  const deal = getEnterpriseDeal(dealId);
  if (!deal) return result; // unreachable - validateDeliverEnterpriseDeal already checked this

  const model = findBestEligibleModel(state.completedModels, deal);
  if (!model) return result; // unreachable - validateDeliverEnterpriseDeal already checked this

  // Phase 8 "Employee Assignment & Departments Foundation" (spec section
  // 2-3: Enterprise Sales -> "Enterprise案件発生率/契約成功率"): folded in
  // here as a reward multiplier (deal APPEARANCE isn't tick-driven in this
  // codebase - deals are a static catalog, see data/enterpriseDeals.ts - so
  // "contract success" is the meaningful lever available at delivery time).
  const salesMultiplier = getSalesEffectMultiplier(state) + getEnterpriseSalesDepartmentBonus(state);
  const strategyMultiplier = getCompanyStrategyMultiplier(state, "enterprise");
  const reward = calculateEnterpriseReward(deal, salesMultiplier, strategyMultiplier);
  const reputationGain = reputationGainFromEnterpriseDeal();

  set((s) => ({
    cash: s.cash + reward,
    completedEnterpriseDealIds: [...s.completedEnterpriseDealIds, dealId],
    reputation: clampReputation(s.reputation + reputationGain),
    eventLog: appendEvent(
      s.eventLog,
      "success",
      `Enterpriseライセンスを納品しました: ${deal.name}（+$${reward.toFixed(0)}、使用モデル: ${model.name}）。`,
      s.gameTimeSeconds,
    ),
  }));
  saveGame(get());
  // No dedicated "enterprise" SFX key in the manifest (UI Professional Polish
  // Sprint section 13 scope is hookup, not new audio assets) - "deploy"
  // reads as an equally fitting "delivery completed" cue.
  playSound("deploy");
  return ok(undefined);
}
