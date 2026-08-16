import type { GameState } from "../types/game";
import type { EventDefinition } from "../types/eventSystem";
import { getDepartmentHeadcount } from "./departments";

/**
 * Phase 15 "Event System Expansion" (spec section 7): the roster of
 * EventDefinitions engine/eventSystem.ts's resolveEventSystemTick picks
 * from. 15 events across 6 of the 11 candidate categories (competitor x4,
 * infrastructure x3, facility x1, research x2, legal x1, enterprise x2,
 * hr x2) - "finance"/"market"/"positive"/"negative" are left unpopulated
 * this phase (still valid EventCategory values for future authors, per the
 * spec's own candidate list).
 *
 * Every effect magnitude below is deliberately small and either a flat
 * constant or a small percentage of a CURRENT state value (never a fixed
 * fraction of max possible cash/reputation/etc) - see each event's own
 * comment for the specific spec-section-6 constraint it respects ("一撃で
 * 倒産させない" / "大量のcashを与えない" / "対策不能な大損害を与えない"). None of
 * these events destroy a GPU/cooling unit, delete a model, or touch
 * Objective/Milestone/save-shape state directly - only the small EventEffect
 * delta fields defined in types/eventSystem.ts.
 *
 * `conditions`/`effects` intentionally reuse the SAME engine/departmentEffects.ts
 * -style helpers (here just getDepartmentHeadcount) the rest of the engine
 * layer already uses - e.g. an event's effect is smaller/absent when a
 * relevant department is staffed, "showing the department's value" per spec
 * section 7's framing, without inventing any new department-effect formula.
 */

function leadingCompetitor(state: GameState) {
  if (state.competitors.length === 0) return null;
  return state.competitors.reduce((best, c) => (c.marketShare > best.marketShare ? c : best), state.competitors[0]);
}

function findCompetitor(state: GameState, id: string) {
  return state.competitors.find((c) => c.id === id) ?? null;
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
  // ---- Competitor events (spec 7-1) ----------------------------------------
  {
    id: "competitor_model_launch",
    category: "competitor",
    title: "Competitor Model Launch",
    description: "A rival company announces a new model, temporarily pressuring your market share.",
    triggerType: "periodic",
    weight: 1.2,
    cooldownDays: 14,
    minDay: 3,
    conditions: () => true,
    // Small, one-time marketShare nudge (NOT a burn-rate change) - never
    // more than 0.35pt, and marketShare still only eases toward its target
    // afterward (engine/marketShare.ts), so this can't compound.
    effects: () => ({ marketShareDelta: -0.35 }),
    severity: "minor",
    relatedTab: "market",
    logMessage: (state) => {
      const c = leadingCompetitor(state);
      const name = c?.name ?? "競合企業";
      return `${name}が新モデルを発表しました。市場での競合圧力が高まっています（市場シェア -0.35pt）。`;
    },
  },
  {
    id: "open_research_breakthrough",
    category: "competitor",
    title: "Open Research Breakthrough",
    description: "OpenMind Labs publishes a research breakthrough - a small research boost, but the rival looks stronger.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 18,
    minDay: 5,
    conditions: () => true,
    effects: () => ({ researchPointsDelta: 10, marketShareDelta: -0.15 }),
    severity: "minor",
    relatedTab: "tech",
    logMessage: (state) => {
      const name = findCompetitor(state, "openmind_labs")?.name ?? "OpenMind Labs";
      return `${name}が研究成果を公開しました（研究ポイント +10）。競合の存在感が増しています（市場シェア -0.15pt）。`;
    },
  },
  {
    id: "enterprise_push_neo_ai",
    category: "competitor",
    title: "Enterprise Push by NeoAI",
    description: "NeoAI pushes aggressively into the enterprise market - a staffed Enterprise Sales department softens the impact.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 16,
    minDay: 10,
    conditions: () => true,
    effects: (state) => ({ marketShareDelta: getDepartmentHeadcount(state, "enterpriseSales") > 0 ? -0.2 : -0.4 }),
    severity: "minor",
    relatedTab: "market",
    logMessage: (state) => {
      const name = findCompetitor(state, "neo_ai")?.name ?? "NeoAI";
      const mitigated = getDepartmentHeadcount(state, "enterpriseSales") > 0;
      const delta = mitigated ? "-0.2pt" : "-0.4pt";
      const note = mitigated ? "（Enterprise Sales部署の配置が影響を和らげています）" : "";
      return `${name}が法人市場で攻勢をかけています（市場シェア ${delta}）${note}。`;
    },
  },
  {
    id: "consumer_hype_wave",
    category: "competitor",
    title: "Consumer Hype Wave",
    description: "DeepFuture gets consumer buzz - a staffed Customer Success department softens the reputation impact.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 16,
    minDay: 7,
    conditions: () => true,
    effects: (state) => ({ reputationDelta: getDepartmentHeadcount(state, "customerSuccess") > 0 ? -0.5 : -1.5 }),
    severity: "minor",
    relatedTab: "market",
    logMessage: (state) => {
      const name = findCompetitor(state, "deep_future")?.name ?? "DeepFuture";
      const mitigated = getDepartmentHeadcount(state, "customerSuccess") > 0;
      const note = mitigated ? "（Customer Success部署の配置が影響を和らげています）" : "";
      return `${name}が一般消費者向けで話題になっています${note}。`;
    },
  },

  // ---- Infrastructure / Facility events (spec 7-2) -------------------------
  {
    id: "cooling_incident_warning",
    category: "infrastructure",
    title: "Cooling Incident Warning",
    description: "Cooling systems are under strain - staffing Infrastructure helps avoid this.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 10,
    minDay: 2,
    conditions: (state) => (state.isThrottling || state.temperature > 55) && getDepartmentHeadcount(state, "infrastructure") === 0,
    effects: () => ({ reputationDelta: -1 }),
    severity: "minor",
    relatedTab: "datacenter",
    logMessage: () => "冷却設備に負荷がかかっています。Infrastructure部署の配置を検討してください（評判 -1）。",
  },
  {
    id: "power_contract_review",
    category: "infrastructure",
    title: "Power Contract Review",
    description: "A power contract review, triggered when power usage is running hot.",
    triggerType: "periodic",
    weight: 0.8,
    cooldownDays: 14,
    minDay: 4,
    conditions: (state) => state.powerCapacity > 0 && state.powerUsage / state.powerCapacity > 0.85,
    // Capped absolutely AND proportionally, and only fires at all above
    // $1000 cash - never a meaningful step toward bankruptcy on its own.
    effects: (state) => ({ cashDelta: state.cash > 1000 ? -Math.min(2000, state.cash * 0.005) : 0 }),
    severity: "minor",
    relatedTab: "datacenter",
    logMessage: (state) => {
      const delta = state.cash > 1000 ? Math.min(2000, state.cash * 0.005) : 0;
      return delta > 0
        ? `電力契約の見直しが行われました（対応費 -$${delta.toFixed(0)}）。Power容量の増強を検討してください。`
        : "電力契約の見直しが行われました。Power容量の増強を検討してください。";
    },
  },
  {
    id: "gpu_supply_shortage",
    category: "infrastructure",
    title: "GPU Supply Shortage",
    description: "News of a GPU price spike - log only this phase, a future phase may connect this to purchase cost.",
    triggerType: "periodic",
    weight: 0.7,
    cooldownDays: 21,
    minDay: 5,
    conditions: (state) => state.ownedGpus.length > 0,
    effects: () => ({}),
    severity: "info",
    relatedTab: "datacenter",
    logMessage: () => "GPU価格高騰のニュースが流れています。今後のGPU購入は割高になるかもしれません。",
  },
  {
    id: "datacenter_efficiency_audit",
    category: "facility",
    title: "Datacenter Efficiency Audit",
    description: "An efficiency audit of facility operations - only fires with a staffed Infrastructure department.",
    triggerType: "periodic",
    weight: 0.8,
    cooldownDays: 18,
    minDay: 6,
    conditions: (state) => getDepartmentHeadcount(state, "infrastructure") > 0,
    effects: (state) => ({ cashDelta: Math.min(1500, Math.max(200, state.cash * 0.003)), reputationDelta: 0.5 }),
    severity: "info",
    relatedTab: "datacenter",
    logMessage: (state) => {
      const saving = Math.min(1500, Math.max(200, state.cash * 0.003));
      return `施設運用の監査が行われ、小さなコスト削減が見つかりました（+$${saving.toFixed(0)}、評判 +0.5）。`;
    },
  },

  // ---- Research / Data events (spec 7-3) -----------------------------------
  {
    id: "university_collaboration_offer",
    category: "research",
    title: "University Collaboration Offer",
    description: "A university offers joint research - only fires with a staffed Research department.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 14,
    minDay: 5,
    conditions: (state) => getDepartmentHeadcount(state, "research") > 0,
    effects: () => ({ researchPointsDelta: 12 }),
    severity: "info",
    relatedTab: "tech",
    logMessage: () => "大学との共同研究オファーが届きました（研究ポイント +12）。",
  },
  {
    id: "high_quality_dataset_opportunity",
    category: "research",
    title: "High Quality Dataset Opportunity",
    description: "An opportunity to acquire a high quality dataset - only fires with a staffed Data department.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 12,
    minDay: 4,
    conditions: (state) => getDepartmentHeadcount(state, "data") > 0,
    effects: (state) => ({ cleanDataDelta: Math.max(3, state.cleanData * 0.1), researchPointsDelta: 3 }),
    severity: "info",
    relatedTab: "org",
    logMessage: (state) => {
      const gain = Math.max(3, state.cleanData * 0.1);
      return `高品質なデータセットの取得機会がありました（整備済みデータ +${gain.toFixed(1)}TB、研究ポイント +3）。`;
    },
  },
  {
    id: "dataset_quality_backlash",
    category: "legal",
    title: "Dataset Quality Backlash",
    description: "Public criticism of data quality - fires when reputation is already low.",
    triggerType: "periodic",
    weight: 0.7,
    cooldownDays: 18,
    minDay: 10,
    conditions: (state) => state.reputation < 45,
    effects: () => ({ reputationDelta: -2 }),
    severity: "minor",
    relatedTab: "log",
    logMessage: () => "データ品質への批判が広がっています（評判 -2）。Legal/Data部署の強化を検討してください。",
  },

  // ---- Enterprise / Legal events (spec 7-4) --------------------------------
  {
    id: "enterprise_security_review",
    category: "enterprise",
    title: "Enterprise Security Review",
    description: "An enterprise customer requests a security review - a staffed Legal/Compliance department avoids any impact.",
    triggerType: "periodic",
    weight: 0.9,
    cooldownDays: 16,
    minDay: 10,
    conditions: (state) => state.completedEnterpriseDealIds.length > 0,
    effects: (state) => (getDepartmentHeadcount(state, "legal") > 0 ? {} : { reputationDelta: -1.5 }),
    severity: "minor",
    relatedTab: "market",
    logMessage: (state) => {
      const staffed = getDepartmentHeadcount(state, "legal") > 0;
      return staffed
        ? "法人顧客からセキュリティ確認の依頼がありました。Legal/Compliance部署のおかげで問題なく対応できました。"
        : "法人顧客からセキュリティ確認の依頼がありました。Legal/Compliance部署の不在が響いています（評判 -1.5）。";
    },
  },
  {
    id: "flagship_customer_referral",
    category: "enterprise",
    title: "Flagship Customer Referral",
    description: "A satisfied enterprise customer refers a new one - only fires with a staffed Customer Success department and high reputation.",
    triggerType: "periodic",
    weight: 0.8,
    cooldownDays: 20,
    minDay: 10,
    conditions: (state) => getDepartmentHeadcount(state, "customerSuccess") > 0 && state.reputation >= 60,
    effects: () => ({ brandDelta: 0.3 }),
    severity: "minor",
    relatedTab: "market",
    logMessage: () => "大口顧客から新規顧客の紹介がありました（ブランド力 +0.3）。",
  },

  // ---- HR / Morale events (spec 7-5) ---------------------------------------
  {
    id: "employee_burnout_signal",
    category: "hr",
    title: "Employee Burnout Signal",
    description: "Signs of employee burnout - a staffed HR department softens the further decline.",
    triggerType: "periodic",
    weight: 1,
    cooldownDays: 12,
    minDay: 5,
    conditions: (state) => state.staffMorale < 55,
    effects: (state) => ({ staffMoraleDelta: getDepartmentHeadcount(state, "hr") > 0 ? -1 : -3 }),
    severity: "major",
    relatedTab: "org",
    logMessage: (state) => {
      const mitigated = getDepartmentHeadcount(state, "hr") > 0;
      return mitigated
        ? "社員疲労の兆候が見られます。HR部署の配置が事態の悪化を抑えています（士気 -1）。"
        : "社員疲労の兆候が見られます。HR部署の配置を検討してください（士気 -3）。";
    },
  },
  {
    id: "recruiting_momentum",
    category: "hr",
    title: "Recruiting Momentum",
    description: "Strong employer brand draws recruiting attention - fires when brand is meaningfully built up.",
    triggerType: "periodic",
    weight: 0.9,
    cooldownDays: 16,
    minDay: 5,
    conditions: (state) => state.brand > 4,
    effects: () => ({ staffMoraleDelta: 2 }),
    severity: "info",
    relatedTab: "org",
    logMessage: () => "採用市場で会社が注目を集めています（士気 +2）。",
  },
];

export const EVENT_DEFINITION_MAP: Record<string, EventDefinition> = Object.fromEntries(
  EVENT_DEFINITIONS.map((def) => [def.id, def]),
);

export function getEventDefinition(id: string): EventDefinition | undefined {
  return EVENT_DEFINITION_MAP[id];
}
