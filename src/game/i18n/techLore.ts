import type { Language } from "./index";

/**
 * Phase 2 Polish (spec section 3: "研究の詳細説明を読み応えのあるものにする").
 * Optional, STATIC flavor text for the Tech Tree detail panel - lives here
 * (not on TechSpec in data/techs.ts) for the exact same reason dataNames.ts
 * keeps display names/descriptions out of the data layer: this is pure
 * presentation text, looked up by id at render time, so it can never affect
 * SaveData/GameState shape and a save from before this sprint loads
 * identically (a missing entry here just means "no lore section shown",
 * not a migration concern).
 *
 * Not every TECH_SPECS entry has an entry here - historicalNote/
 * businessImpact are both optional per spec 3-1, and only techs where they
 * add real reading value get one. Text is written as clearly in-universe
 * flavor (a "how the game's world tells this story" tone), not as a claim
 * about real-world AI history - spec 3-3's "avoid over-claiming/definitive
 * real-world statements" applies here too even though this is about tech,
 * not hardware.
 */
export type TechLoreEntry = {
  historicalNote?: { ja: string; en: string };
  businessImpact?: { ja: string; en: string };
};

const TECH_LORE: Record<string, TechLoreEntry> = {
  transformer_architecture: {
    historicalNote: {
      ja: "「注意機構」と呼ばれる仕組みが登場して以来、言語モデルの設計思想は大きく塗り替えられたと言われている。この技術も、その系譜の上に成り立つ。",
      en: "Industry lore holds that a shift toward \"attention\"-based designs reshaped how language models were built industry-wide - this tech stands on that same lineage.",
    },
    businessImpact: {
      ja: "1Bパラメータ級モデルの学習とA100ノードの調達が可能になり、ガレージ運営から本格的なAI企業への第一歩を踏み出せる。",
      en: "Unlocks 1B-parameter-class training and the A100 Node - the first real step from a garage operation toward a genuine AI company.",
    },
  },
  advanced_cooling: {
    businessImpact: {
      ja: "液冷ループが使えるようになり、空冷の限界を超えて演算資源を積み増せるようになる。熱暴走のリスクを抑えつつ拡張できる点が経営上の価値。",
      en: "Unlocks the Liquid Cooling Loop, pushing past air-cooling's ceiling so compute can keep scaling without a runaway thermal risk.",
    },
  },
  scalable_training: {
    historicalNote: {
      ja: "モデルとデータの両方を安定してスケールさせる訓練手法が確立されたことで、7B級モデルの学習が現実的な選択肢になったとされる。",
      en: "Once training pipelines could reliably scale both model size and data together, 7B-class runs reportedly went from a research curiosity to a practical option.",
    },
    businessImpact: {
      ja: "H100ラックの調達と7Bクラスの学習が解放され、プロダクトとして通用する規模のモデルへ手が届く。",
      en: "Unlocks the H100 Rack and 7B-class training - the first models big enough to plausibly ship as a real product.",
    },
  },
  immersion_cooling: {
    businessImpact: {
      ja: "液浸冷却タンクを導入でき、ラック単位を超えた冷却能力で施設全体の演算密度を引き上げられる。",
      en: "Unlocks the Immersion Cooling Tank, raising the whole facility's compute density beyond what rack-level cooling alone can sustain.",
    },
  },
  frontier_models: {
    historicalNote: {
      ja: "業界では、あるモデル規模を境に性能が非連続に伸びる「創発」が観測されたと語られる。70B級はまさにその境界線上にあるとされる規模だ。",
      en: "Industry chatter often points to a scale where capability jumps rather than climbs smoothly - 70B-class sits right around where that line is usually drawn.",
    },
    businessImpact: {
      ja: "700億パラメータ級の学習が解放され、フロンティア企業として競合と渡り合える規模のモデルを持てるようになる。",
      en: "Unlocks 70B-class training - the scale at which a company can credibly claim a seat among the frontier labs.",
    },
  },
  custom_silicon: {
    historicalNote: {
      ja: "汎用GPUへの依存を減らすため、自社設計チップに投資する動きが業界で広がったと言われる時期がある。",
      en: "There's said to have been a stretch where major players increasingly bet on in-house silicon to cut their reliance on general-purpose GPUs.",
    },
    businessImpact: {
      ja: "カスタムシリコンPodを調達でき、外部ベンダー依存を減らしながら演算コストの構造そのものを作り変えられる。",
      en: "Unlocks the Custom Silicon Pod, reshaping the underlying cost structure of compute instead of just buying more of the same GPUs.",
    },
  },
  agi_theory: {
    historicalNote: {
      ja: "汎用人工知能（AGI）は長らく理論上の到達点として語られてきた。この技術は、その理論をついに実装可能な設計図へと落とし込んだものだ。",
      en: "AGI was long treated as a theoretical horizon more than an engineering target - this research is what finally turns that theory into a buildable blueprint.",
    },
    businessImpact: {
      ja: "AGI-Omni 100Tの学習が解放される。会社の歴史における最終到達点であり、経営上も技術上も最大の賭けとなる。",
      en: "Unlocks AGI-Omni 100T training - the company's ultimate destination, and by far its biggest bet, financially and technically.",
    },
  },
  data_pipeline: {
    businessImpact: {
      ja: "データエンジニアの整備済みデータ生成速度が1.5倍になる。人を増やさずにデータ処理能力を底上げできる、地味だが効く投資。",
      en: "Boosts Data Engineers' clean-data refinement rate by x1.5 - an unglamorous but effective way to raise throughput without hiring more people.",
    },
  },
  synthetic_data: {
    historicalNote: {
      ja: "実データの収集に限界が見え始めた頃から、AIが生成したデータで学習データを補う手法が広まったとされる。",
      en: "Once collecting enough real-world data started to hit a wall, supplementing training sets with AI-generated data reportedly became common practice.",
    },
    businessImpact: {
      ja: "データエンジニアの生データ収集速度が1.5倍になり、モデル訓練のボトルネックになりがちなデータ供給を強化できる。",
      en: "Boosts Data Engineers' raw-data collection rate by x1.5, easing the data-supply bottleneck that training runs tend to hit first.",
    },
  },
  autonomous_data_factory: {
    businessImpact: {
      ja: "生データ収集と整備済みデータ生成の双方が2.0倍になり（下位技術を上書き）、データパイプライン全体をほぼ無人で回せる規模に到達する。",
      en: "Boosts both raw-data collection and clean-data refinement to x2.0 (superseding the earlier tiers) - the data pipeline effectively runs itself at this scale.",
    },
  },
  // Phase 9 "Research Expansion Foundation" (spec section 3-2/3-3).
  quantization: {
    historicalNote: {
      ja: "サービング時のモデルを低精度の数値表現に落とし込む手法は、業界で「重い割に効果が大きい」最適化としてよく語られる。",
      en: "Serving models at reduced numeric precision is often described industry-wide as an optimization that's cheap to adopt but disproportionately effective.",
    },
    businessImpact: {
      ja: "全デプロイモデルの推論コストが下がり、利益率を底上げできる。特にAPI呼び出し量の多いモデルほど効果を体感しやすい。",
      en: "Lowers inference cost across every deployed model, lifting margins broadly - the effect is most noticeable on your highest-traffic API models.",
    },
  },
  kv_cache_optimization: {
    businessImpact: {
      ja: "対話型（Chat）モデルの推論コストをさらに引き下げる。会話が長く続くほど効果が大きい、Chat特化の最適化。",
      en: "Further cuts inference cost specifically for conversational (Chat) models - the longer a conversation runs, the more this optimization pays off.",
    },
  },
  batch_inference: {
    businessImpact: {
      ja: "推論リクエストをバッチにまとめて処理することで、1リクエストあたりのオーバーヘッドを削減し、推論コストを引き下げる。",
      en: "Groups inference requests into batches, cutting per-request overhead and lowering inference cost.",
    },
  },
  speculative_decoding: {
    historicalNote: {
      ja: "小さなモデルに候補トークンを先読みさせ、本命モデルが検証だけを行うことで生成を高速化する手法が広まったとされる。",
      en: "A technique where a smaller model drafts candidate tokens ahead of time, letting the main model just verify them, reportedly spread as a way to speed up generation.",
    },
    businessImpact: {
      ja: "推論コストをさらに引き下げる、上級者向けの最適化。KVキャッシュ最適化の先に位置づけられる。",
      en: "An advanced-tier inference-cost reduction, building on top of KV Cache Optimization.",
    },
  },
  model_distillation: {
    historicalNote: {
      ja: "大規模モデルの知識をより小さなモデルへ「蒸留」する手法は、性能をあまり落とさずコストを下げる定番の手段として語られる。",
      en: "\"Distilling\" a large model's knowledge into a smaller one is often cited as a standard way to cut cost without giving up much capability.",
    },
    businessImpact: {
      ja: "推論コストを引き下げ、小型モデルの利益率を改善する。粗利率が低いモデルほど恩恵が大きい。",
      en: "Reduces inference cost and improves margin on smaller models - the lower a model's current gross margin, the bigger the relative benefit.",
    },
  },
  mixed_precision_training: {
    businessImpact: {
      ja: "学習ループに低精度演算を組み込むことで、学習速度が上がる。学習期間の短縮は、より多くのモデルを同じ期間で送り出せることを意味する。",
      en: "Mixing lower-precision arithmetic into the training loop speeds up training - shorter training runs mean shipping more models in the same stretch of time.",
    },
  },
  gradient_checkpointing: {
    businessImpact: {
      ja: "メモリと再計算をトレードオフすることで、学習速度をさらに引き上げる。混合精度学習の効果に上乗せされる。",
      en: "Trades recomputation for memory headroom, further increasing training speed - stacks on top of Mixed Precision Training's bonus.",
    },
  },
  distributed_training: {
    historicalNote: {
      ja: "1台のクラスタでは間に合わなくなった学習ジョブを、クラスタ全体に分散させて回す手法が主流になったと言われる時期がある。",
      en: "There's said to have been a point where training jobs outgrew any single cluster node, and spreading the work across the whole cluster became the norm.",
    },
    businessImpact: {
      ja: "学習速度を大きく引き上げる、学習最適化の到達点。特に大規模モデルの学習期間短縮に効く。",
      en: "The capstone of the Training Optimization line - a major training-speed boost, most noticeable on your largest model training runs.",
    },
  },
  synthetic_data_engine: {
    businessImpact: {
      ja: "Synthetic Dataset Saleの報酬を引き上げる。合成データを外部に販売するビジネスの収益性を底上げする。",
      en: "Increases the reward from Synthetic Dataset Sale, making the synthetic-data resale business more profitable.",
    },
  },
  dataset_quality_scoring: {
    businessImpact: {
      ja: "整備済みデータセットの品質をスコアリングし、より適正な価格で販売できるようにする。Clean Dataset Saleの報酬が上がる。",
      en: "Scores clean datasets for quality so they can be priced more accurately, increasing the reward from Clean Dataset Sale.",
    },
  },
  power_distribution: {
    businessImpact: {
      ja: "Power Capacity内部アップグレードの効果を底上げする。施設の電力インフラへの投資効率を引き上げる技術。",
      en: "Boosts the Power Capacity Internal Upgrade's effect - a technology that raises the return on your facility's power infrastructure investment.",
    },
  },
  rack_density_planning: {
    businessImpact: {
      ja: "Rack Space内部アップグレードの効果を底上げする。同じ施設の中でより多くのGPUを収容できるようにする設計知見。",
      en: "Boosts the Rack Space Internal Upgrade's effect - design know-how for packing more GPU capacity into the same facility footprint.",
    },
  },
  financial_planning: {
    businessImpact: {
      ja: "Finance部署の支出削減効果を引き上げる。組織の財務体制がより実効性を持つようになる。",
      en: "Increases the Finance department's expense-discount effect, making the organization's financial function more effective.",
    },
  },
  hr_process: {
    businessImpact: {
      ja: "HR部署の採用コスト削減効果を引き上げる。採用プロセスの整備がそのまま経営コストの削減に直結する。",
      en: "Increases the HR department's hiring-cost-discount effect - a more mature hiring process translates directly into lower operating cost.",
    },
  },
  compliance_program: {
    businessImpact: {
      ja: "Legal/Compliance部署のリスク低減指標を引き上げる（現在は表示のみ）。将来的なEnterprise契約成功率への布石。",
      en: "Increases the Legal/Compliance department's risk-reduction indicator (display only for now) - groundwork for a future Enterprise deal success-rate hook.",
    },
  },
  customer_success_playbook: {
    businessImpact: {
      ja: "Customer Success部署の評判上昇効果を引き上げる。顧客対応の型化が、評判という無形資産に直結する。",
      en: "Increases the Customer Success department's reputation-growth effect - a formalized customer-support playbook translates directly into the intangible asset that is reputation.",
    },
  },
};

/** Optional lore for a tech id, or undefined if none is written for it - callers should render nothing (not a placeholder) in that case. */
export function getTechLore(techId: string): TechLoreEntry | undefined {
  return TECH_LORE[techId];
}

/** Convenience accessor for a single lore field in the current language. */
export function getTechLoreText(
  techId: string,
  field: "historicalNote" | "businessImpact",
  language: Language,
): string | undefined {
  const entry = TECH_LORE[techId]?.[field];
  if (!entry) return undefined;
  return language === "en" ? entry.en : entry.ja;
}
