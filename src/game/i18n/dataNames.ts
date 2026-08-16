import type { Language } from "./index";

/**
 * Display names/descriptions for game DATA constants (GPU_SPECS, COOLING_SPECS,
 * FACILITY_SPECS, TECH_SPECS, MODEL_SPECS, STAFF_SPECS, FUNDING_ROUNDS).
 *
 * Deliberately kept OUT of src/game/data/*.ts: those files' `name`/`description`
 * fields are the spec-defined shape (GpuSpec.name, TechSpec.description, ...)
 * and are still used as English-language fallbacks / internal identifiers by
 * engine and store/action code (e.g. Event Log message composition) - changing
 * that shape would be a much larger, riskier diff than Sprint 2 calls for.
 * Instead this module is a pure id -> {ja, en} lookup table that UI components
 * call instead of reading `spec.name` directly, so a Japanese/English switch
 * changes every displayed hardware/tech/model/staff/funding name without
 * touching src/game/data/ or src/game/types/ at all.
 */
export type DisplayNameCategory =
  | "gpu"
  | "cooling"
  | "facility"
  | "tech"
  | "model"
  | "staff"
  | "fundingRound"
  | "enterpriseDeal"
  | "companyStrategy"
  | "competitor"
  | "department";

type Entry = { ja: string; en: string; jaDesc?: string; enDesc?: string };

const GPU: Record<string, Entry> = {
  used_gtx_cluster: {
    ja: "中古GTXクラスタ",
    en: "Used GTX Cluster",
    jaDesc: "ガレージに転がっていたジャンク品を寄せ集めた最初の演算資源。",
    enDesc: "A scavenged pile of junk GPUs - your very first compute.",
  },
  rtx3060_cluster: {
    ja: "RTX3060クラスタ",
    en: "RTX 3060 Cluster",
    jaDesc: "中古GTXクラスタの次に組む、手頃な小規模クラスタ。",
    enDesc: "An affordable step up from the Used GTX Cluster.",
  },
  rtx4090_cluster: {
    ja: "RTX4090クラスタ",
    en: "RTX 4090 Cluster",
    jaDesc: "ハイエンドゲーミングGPUを寄せ集めた本格クラスタ。",
    enDesc: "A serious cluster built from high-end gaming GPUs.",
  },
  rtx_prosumer_rig: {
    ja: "RTXプロシューマーリグ",
    en: "RTX Prosumer Rig",
    jaDesc: "ゲーミング向けGPUを転用した中規模の演算クラスタ。",
    enDesc: "A mid-tier rig built from repurposed gaming GPUs.",
  },
  a40_rack: {
    ja: "A40ラック",
    en: "A40 Rack",
    jaDesc: "プロシューマー機材からデータセンターGPUへの橋渡し。",
    enDesc: "A bridge from prosumer gear to true datacenter GPUs.",
  },
  a100_node: {
    ja: "A100ノード",
    en: "A100 Node",
    jaDesc: "本格的な機械学習向けデータセンターGPU。",
    enDesc: "A proper datacenter-grade ML accelerator.",
  },
  h100_rack: {
    ja: "H100ラック",
    en: "H100 Rack",
    jaDesc: "大規模学習に耐える最新世代のGPUラック。",
    enDesc: "A rack of latest-generation GPUs built for large-scale training.",
  },
  mi300_cluster: {
    ja: "MI300クラスタ",
    en: "MI300 Cluster",
    jaDesc: "フロンティアモデル時代を支える大容量VRAMクラスタ。",
    enDesc: "A high-VRAM cluster built for the frontier-model era.",
  },
  b200_superpod: {
    ja: "B200スーパーPod",
    en: "B200 Super Pod",
    jaDesc: "最新世代の超大規模演算Pod。",
    enDesc: "A next-generation, massively parallel compute pod.",
  },
  custom_silicon_pod: {
    ja: "カスタムシリコンPod",
    en: "Custom Silicon Pod",
    jaDesc: "自社設計チップによる究極の演算ユニット。",
    enDesc: "In-house designed silicon - the ultimate compute unit.",
  },
  exascale_compute_array: {
    ja: "エクサスケール演算アレイ",
    en: "Exascale Compute Array",
    jaDesc: "AGI開発の最終段階を支える、想像を絶する規模の演算基盤。",
    enDesc: "An almost unimaginably large compute base for the final push to AGI.",
  },
};

const COOLING: Record<string, Entry> = {
  box_fan: {
    ja: "ボックスファン",
    en: "Box Fan",
    jaDesc: "ホームセンターで買ってきた扇風機。無いよりはマシ。",
    enDesc: "A fan from the hardware store. Better than nothing.",
  },
  industrial_fan: {
    ja: "業務用ファン",
    en: "Industrial Fan",
    jaDesc: "ボックスファンより一回り強力な送風設備。",
    enDesc: "A step up from the Box Fan - more airflow, still simple.",
  },
  home_ac: {
    ja: "家庭用エアコン",
    en: "Home AC Unit",
    jaDesc: "家庭向けの空調機を転用した冷却手段。",
    enDesc: "A repurposed home air conditioner.",
  },
  industrial_ac: {
    ja: "業務用エアコン",
    en: "Industrial AC",
    jaDesc: "小規模オフィス向けの本格的な空調設備。",
    enDesc: "A proper HVAC unit sized for a small office.",
  },
  rack_cooling: {
    ja: "ラック冷却システム",
    en: "Rack Cooling System",
    jaDesc: "サーバーラック単位で冷却するデータセンター向け設備。",
    enDesc: "Datacenter-grade cooling applied rack by rack.",
  },
  liquid_cooling: {
    ja: "液冷ループ",
    en: "Liquid Cooling Loop",
    jaDesc: "循環液でGPUを直接冷却する高効率システム。",
    enDesc: "A closed-loop liquid system cooling GPUs directly.",
  },
  direct_to_chip: {
    ja: "ダイレクト・トゥ・チップ冷却",
    en: "Direct-to-Chip Cooling",
    jaDesc: "チップ表面に直接冷却液を通す高効率な冷却方式。",
    enDesc: "Routes coolant directly across the chip surface.",
  },
  immersion_cooling: {
    ja: "液浸冷却タンク",
    en: "Immersion Cooling Tank",
    jaDesc: "サーバーごと冷却液に沈める最先端の熱対策。",
    enDesc: "Submerges entire servers in coolant - state of the art.",
  },
  seawater_cooling: {
    ja: "海水冷却施設",
    en: "Seawater Cooling Facility",
    jaDesc: "海水を熱交換に利用する大規模冷却施設。",
    enDesc: "A massive facility using seawater as a heat sink.",
  },
  cryogenic_cooling: {
    ja: "極低温冷却システム",
    en: "Cryogenic Cooling System",
    jaDesc: "極低温まで冷やし込む、終盤の演算基盤を支える冷却技術。",
    enDesc: "Cools to cryogenic temperatures - built for the endgame compute base.",
  },
};

const FACILITY: Record<string, Entry> = {
  garage: {
    ja: "ガレージ",
    en: "Garage",
    jaDesc: "配線がむき出しの、すべてが始まった場所。",
    enDesc: "Exposed wiring, concrete floor - where it all began.",
  },
  // Phase 7 "Facility Expansion & Internal Upgrades Sprint" (new tier, between Garage and Small Office).
  shared_office: {
    ja: "シェアオフィス",
    en: "Shared Office",
    jaDesc: "コワーキングスペースの一角を間借りした最初の拠点拡張。",
    enDesc: "A corner of a coworking space - the first step up from the garage.",
  },
  small_office: {
    ja: "雑居ビルの小規模オフィス",
    en: "Small Office",
    jaDesc: "机とラックが並ぶ、スタートアップらしい手狭な拠点。",
    enDesc: "Desks and a rack or two - a cramped but real startup office.",
  },
  // Phase 7 (new tier, between Small Office and Server Room).
  small_ai_lab: {
    ja: "小規模AIラボ",
    en: "Small AI Lab",
    jaDesc: "専用サーバーラックを構えた、初めての本格的な研究拠点。",
    enDesc: "A dedicated server rack - your first real research lab.",
  },
  // Phase 7 (new tier, between Small AI Lab and Server Room).
  dedicated_ai_lab: {
    ja: "専用AIラボ",
    en: "Dedicated AI Lab",
    jaDesc: "複数のラックと専用冷却系を備えた、フル稼働の研究拠点。",
    enDesc: "Multiple racks and dedicated cooling - a lab running at full tilt.",
  },
  server_room: {
    ja: "サーバールーム",
    en: "Server Room",
    jaDesc: "青いLEDが並ぶ、本格的な運用管理が始まる拠点。",
    enDesc: "Rows of blue LEDs - real operations management begins here.",
  },
  data_center: {
    ja: "データセンター",
    en: "Data Center",
    jaDesc: "床下配線と冷却設備を備えた大規模施設。",
    enDesc: "A large facility with raised floors and serious cooling.",
  },
  // Phase 7 (new tier, between Data Center and Hyperscale Campus).
  regional_data_center: {
    ja: "リージョナルデータセンター",
    en: "Regional Data Center",
    jaDesc: "複数の建屋にまたがる地域規模のデータセンター群。",
    enDesc: "A regional cluster of data centers spanning several buildings.",
  },
  hyperscale_campus: {
    ja: "ハイパースケールキャンパス",
    en: "Hyperscale Campus",
    jaDesc: "液浸冷却タンクが並ぶ、世界的AI企業の中枢拠点。",
    enDesc: "Rows of immersion tanks - the nerve center of a global AI company.",
  },
  // Phase 7 (new top tier, beyond Hyperscale Campus).
  singularity_complex: {
    ja: "シンギュラリティ・コンプレックス",
    en: "Singularity Complex",
    jaDesc: "AGI開発のためだけに設計された、地球規模の演算複合施設。",
    enDesc: "A planet-scale compute complex built for one purpose: AGI.",
  },
};

const TECH: Record<string, Entry> = {
  transformer_architecture: {
    ja: "Transformerアーキテクチャ",
    en: "Transformer Architecture",
    jaDesc: "10億パラメータ級モデルとA100ノードを解放する。",
    enDesc: "Unlocks 1B-class model training and the A100 Node.",
  },
  advanced_cooling: {
    ja: "先進冷却技術",
    en: "Advanced Cooling",
    jaDesc: "液冷ループを解放する。",
    enDesc: "Unlocks the Liquid Cooling Loop.",
  },
  scalable_training: {
    ja: "スケーラブル学習",
    en: "Scalable Training",
    jaDesc: "70億パラメータ級モデルとH100ラックを解放する。",
    enDesc: "Unlocks 7B-class models and the H100 Rack.",
  },
  immersion_cooling: {
    ja: "液浸冷却技術",
    en: "Immersion Cooling",
    jaDesc: "液浸冷却タンクを解放する。",
    enDesc: "Unlocks the Immersion Cooling Tank.",
  },
  frontier_models: {
    ja: "フロンティアモデル",
    en: "Frontier Models",
    jaDesc: "700億パラメータ級モデルの学習を解放する。",
    enDesc: "Unlocks 70B-class model training.",
  },
  custom_silicon: {
    ja: "カスタムシリコン",
    en: "Custom Silicon",
    jaDesc: "カスタムシリコンPodを解放する。",
    enDesc: "Unlocks the Custom Silicon Pod.",
  },
  agi_theory: {
    ja: "AGI理論",
    en: "AGI Theory",
    jaDesc: "AGI-Omni 100Tの学習を解放する。",
    enDesc: "Unlocks AGI-Omni 100T.",
  },
  // Data-automation techs (Sprint 2, given real effects in the Feature
  // Completion Sprint) - see engine/automation.ts's getDataAutomationMultipliers.
  data_pipeline: {
    ja: "データパイプライン",
    en: "Data Pipeline",
    jaDesc: "データエンジニアの整備済みデータ生成量を1.5倍にする。",
    enDesc: "Increases Data Engineers' cleanData refinement rate by x1.5.",
  },
  synthetic_data: {
    ja: "合成データ研究",
    en: "Synthetic Data",
    jaDesc: "データエンジニアの生データ収集量を1.5倍にする。",
    enDesc: "Increases Data Engineers' rawData collection rate by x1.5.",
  },
  autonomous_data_factory: {
    ja: "自律データ工場",
    en: "Autonomous Data Factory",
    jaDesc: "データエンジニアの生データ収集・整備済みデータ生成をどちらも2.0倍にする（下位技術の倍率を上書き）。",
    enDesc: "Boosts Data Engineers' rawData collection and cleanData refinement to x2.0 each (supersedes the earlier tiers).",
  },
  // Phase 9 "Research Expansion Foundation" (spec section 3-3/3-4): 16 new techs.
  quantization: {
    ja: "量子化",
    en: "Quantization",
    jaDesc: "推論時の数値精度を下げることで、全デプロイモデルの推論コストを削減する。",
    enDesc: "Reduces inference cost across every deployed model by lowering numeric precision at serve time.",
  },
  kv_cache_optimization: {
    ja: "KVキャッシュ最適化",
    en: "KV Cache Optimization",
    jaDesc: "Chatカテゴリのモデルに限り、推論コストをさらに削減する。",
    enDesc: "Further reduces inference cost, specifically for Chat-category deployed models.",
  },
  batch_inference: {
    ja: "バッチ推論",
    en: "Batch Inference",
    jaDesc: "推論リクエストをまとめて処理することで、推論コストを削減する。",
    enDesc: "Reduces inference cost by pipelining inference requests into batches.",
  },
  speculative_decoding: {
    ja: "投機的デコーディング",
    en: "Speculative Decoding",
    jaDesc: "複数トークンを先読み生成することで、推論コストをさらに削減する。",
    enDesc: "Further reduces inference cost by speculatively generating multiple tokens ahead.",
  },
  model_distillation: {
    ja: "モデル蒸留",
    en: "Model Distillation",
    jaDesc: "大規模モデルから知識を蒸留することで、推論コストを削減し利益率を改善する。",
    enDesc: "Reduces inference cost (and improves gross margin) by distilling knowledge from larger models.",
  },
  mixed_precision_training: {
    ja: "混合精度学習",
    en: "Mixed Precision Training",
    jaDesc: "低精度演算を学習ループに組み込むことで、学習速度を引き上げる。",
    enDesc: "Increases training speed by mixing lower-precision arithmetic into the training loop.",
  },
  gradient_checkpointing: {
    ja: "勾配チェックポインティング",
    en: "Gradient Checkpointing",
    jaDesc: "メモリ使用量と再計算をトレードオフすることで、学習速度をさらに引き上げる。",
    enDesc: "Further increases training speed by trading recomputation for memory headroom.",
  },
  distributed_training: {
    ja: "分散学習",
    en: "Distributed Training",
    jaDesc: "クラスタ全体に学習を分散させることで、学習速度を大きく引き上げる。",
    enDesc: "Substantially increases training speed by splitting training work across the cluster.",
  },
  synthetic_data_engine: {
    ja: "合成データエンジン",
    en: "Synthetic Data Engine",
    jaDesc: "Synthetic Dataset Saleの報酬を引き上げる。",
    enDesc: "Increases the reward from Synthetic Dataset Sale.",
  },
  dataset_quality_scoring: {
    ja: "データセット品質スコアリング",
    en: "Dataset Quality Scoring",
    jaDesc: "Clean Dataset Saleの報酬を引き上げる。",
    enDesc: "Increases the reward from Clean Dataset Sale.",
  },
  power_distribution: {
    ja: "電力分配最適化",
    en: "Power Distribution",
    jaDesc: "Power Capacity内部アップグレードの効果を引き上げる。",
    enDesc: "Increases the effect of the Power Capacity Internal Upgrade.",
  },
  rack_density_planning: {
    ja: "ラック密度設計",
    en: "Rack Density Planning",
    jaDesc: "Rack Space内部アップグレードの効果を引き上げる。",
    enDesc: "Increases the effect of the Rack Space Internal Upgrade.",
  },
  financial_planning: {
    ja: "財務計画",
    en: "Financial Planning",
    jaDesc: "Finance部署の支出削減効果を引き上げる。",
    enDesc: "Increases the Finance department's expense-discount effect.",
  },
  hr_process: {
    ja: "人事プロセス整備",
    en: "HR Process",
    jaDesc: "HR部署の採用コスト削減効果を引き上げる。",
    enDesc: "Increases the HR department's hiring-cost-discount effect.",
  },
  compliance_program: {
    ja: "コンプライアンスプログラム",
    en: "Compliance Program",
    jaDesc: "Legal/Compliance部署のリスク低減指標を引き上げる（現在は表示のみ）。",
    enDesc: "Increases the Legal/Compliance department's risk-reduction indicator (display only for now).",
  },
  customer_success_playbook: {
    ja: "カスタマーサクセス・プレイブック",
    en: "Customer Success Playbook",
    jaDesc: "Customer Success部署の評判上昇効果を引き上げる。",
    enDesc: "Increases the Customer Success department's reputation-growth effect.",
  },
};

const MODEL: Record<string, Entry> = {
  tinynet_100m: {
    ja: "TinyNet 100M",
    en: "TinyNet 100M",
    jaDesc: "最初の小さなモデル。動作確認向け。",
    enDesc: "Your first tiny model - a proof of concept.",
  },
  smalllm_1b: {
    ja: "SmallLM 1B",
    en: "SmallLM 1B",
    jaDesc: "実用レベルに近づいた小規模言語モデル。",
    enDesc: "A small language model edging toward usefulness.",
  },
  frontierlm_7b: {
    ja: "FrontierLM 7B",
    en: "FrontierLM 7B",
    jaDesc: "商用サービスに耐える中規模モデル。",
    enDesc: "A mid-size model that can carry a real product.",
  },
  titanlm_70b: {
    ja: "TitanLM 70B",
    en: "TitanLM 70B",
    jaDesc: "業界トップクラスの大規模モデル。",
    enDesc: "An industry-leading large model.",
  },
  agi_omni_100t: {
    ja: "AGI-Omni 100T",
    en: "AGI-Omni 100T",
    jaDesc: "人類の知能を超えるとされる究極のモデル。",
    enDesc: "The ultimate model - said to surpass human intelligence.",
  },
};

/**
 * Progression Expansion Sprint: expanded from 3 to 11 roles (see
 * types/staff.ts's StaffRole). jaDesc/enDesc here double as StaffPanel.tsx's
 * "effect" text for every role (including the original 3, which previously
 * used dynamic t()-interpolated strings) - see that component's rewrite doc
 * comment for why a static description was chosen over threading count-based
 * interpolation through 11 roles.
 */
const STAFF: Record<string, Entry> = {
  dataEngineers: {
    ja: "データエンジニア",
    en: "Data Engineer",
    jaDesc: "生データの自動収集と整備済みデータへの自動変換を行う。",
    enDesc: "Automates raw data collection and refinement into clean data.",
  },
  infraOps: {
    ja: "インフラ運用スタッフ",
    en: "Infra Ops",
    jaDesc: "冷却設備の実効能力を引き上げる。",
    enDesc: "Boosts the effective output of your cooling equipment.",
  },
  researchers: {
    ja: "AIリサーチャー",
    en: "AI Researcher",
    jaDesc: "研究ポイントを自動生成する。",
    enDesc: "Automatically generates Research Points.",
  },
  seniorDataEngineers: {
    ja: "シニアデータエンジニア",
    en: "Senior Data Engineer",
    jaDesc: "データエンジニア数人分のデータ処理能力を持つ。",
    enDesc: "Processes data like several regular Data Engineers combined.",
  },
  seniorResearchers: {
    ja: "シニアリサーチャー",
    en: "Senior Researcher",
    jaDesc: "AIリサーチャー数人分の研究ポイントを生成する。",
    enDesc: "Generates Research Points like several regular AI Researchers combined.",
  },
  principalScientists: {
    ja: "プリンシパルサイエンティスト",
    en: "Principal Scientist",
    jaDesc: "研究チームの中核として、極めて高い研究ポイント生産力を持つ。",
    enDesc: "The core of your research team - an exceptionally high Research Point producer.",
  },
  infraLeads: {
    ja: "インフラリード",
    en: "Infrastructure Lead",
    jaDesc: "インフラ運用スタッフより強力な冷却効率向上をもたらす。",
    enDesc: "A stronger cooling-efficiency boost than regular Infra Ops.",
  },
  salesManagers: {
    ja: "セールスマネージャー",
    en: "Sales Manager",
    jaDesc: "ブランド力の成長とEnterprise報酬をわずかに引き上げる。",
    enDesc: "Slightly boosts brand growth and Enterprise deal rewards.",
  },
  enterpriseSalesReps: {
    ja: "エンタープライズ営業",
    en: "Enterprise Sales",
    jaDesc: "ブランド力の成長とEnterprise報酬を大きく引き上げる。",
    enDesc: "Substantially boosts brand growth and Enterprise deal rewards.",
  },
  cto: {
    ja: "CTO",
    en: "CTO",
    jaDesc: "経営幹部。研究ポイント生産量に恒久的なボーナスを与える（定員1名）。",
    enDesc: "Executive hire. Grants a permanent Research Point bonus (capped at 1 hire).",
  },
  coo: {
    ja: "COO",
    en: "COO",
    jaDesc: "経営幹部。総支出を一定割合削減する（定員1名）。",
    enDesc: "Executive hire. Discounts total expenses by a fixed fraction (capped at 1 hire).",
  },
};

const FUNDING_ROUND: Record<string, Entry> = {
  small: { ja: "小規模ラウンド", en: "Small Round" },
  medium: { ja: "中規模ラウンド", en: "Medium Round" },
  mega: { ja: "大規模ラウンド", en: "Mega Round" },
};

/** Enterprise License deal names (Feature Completion Sprint section 1, expanded from 3 to 9 in the Progression Expansion Sprint section 5). See game/data/enterpriseDeals.ts for the underlying id/requirement data. */
const ENTERPRISE_DEAL: Record<string, Entry> = {
  startup_copilot: { ja: "スタートアップ向けコパイロット契約", en: "Startup Copilot Contract" },
  faq_bot: { ja: "FAQボット案件", en: "FAQ Bot Contract" },
  document_search: { ja: "文書検索プラットフォーム", en: "Document Search Platform" },
  coding_assistant: { ja: "コーディングアシスタントライセンス", en: "Coding Assistant License" },
  bank_ai_platform: { ja: "銀行向けAIプラットフォームライセンス", en: "Bank AI Platform License" },
  medical_ai: { ja: "医療AIパートナーシップ", en: "Medical AI Partnership" },
  research_agent: { ja: "リサーチエージェント導入案件", en: "Research Agent Deployment" },
  national_ai_grid: { ja: "国家AIグリッド案件", en: "National AI Grid" },
  finance_ai: { ja: "グローバル金融AIプラットフォーム", en: "Global Finance AI Platform" },
};

/** Progression Expansion Sprint section 12: Company Strategy names. See data/companyStrategies.ts. */
const COMPANY_STRATEGY: Record<string, Entry> = {
  model_lab: {
    ja: "Model Lab",
    en: "Model Lab",
    jaDesc: "研究に強く、Enterprise案件がやや不利になる。",
    enDesc: "Favors research; slightly penalizes Enterprise deals.",
  },
  enterprise_ai: {
    ja: "Enterprise AI Company",
    en: "Enterprise AI Company",
    jaDesc: "Enterprise案件に強く、サブスク収益がやや不利になる。",
    enDesc: "Favors Enterprise deals; slightly penalizes subscription revenue.",
  },
  ai_saas: {
    ja: "AI SaaS Company",
    en: "AI SaaS Company",
    jaDesc: "サブスク収益に強く、GPU Rentalがやや不利になる。",
    enDesc: "Favors subscription revenue; slightly penalizes GPU Rental.",
  },
  cloud_provider: {
    ja: "Cloud Provider",
    en: "Cloud Provider",
    jaDesc: "GPU Rentalに強く、研究がやや不利になる。",
    enDesc: "Favors GPU Rental; slightly penalizes research.",
  },
};

/**
 * Progression Expansion Sprint section 9: competitor company names. See
 * data/competitors.ts. jaDesc/enDesc added in Phase 14 "Market & Competitor
 * Redesign" (spec section 3-4) - short flavor descriptions matching each
 * competitor's `focus`/story in data/competitors.ts's COMPETITOR_DEFINITIONS,
 * shown on the Competitors subtab (MarketPanel.tsx).
 */
const COMPETITOR: Record<string, Entry> = {
  openmind_labs: {
    ja: "OpenMind Labs",
    en: "OpenMind Labs",
    jaDesc: "研究主導で最先端のモデル品質を追い求める研究特化型企業。",
    enDesc: "A research-driven lab chasing frontier model quality above all.",
  },
  neo_ai: {
    ja: "NeoAI",
    en: "NeoAI",
    jaDesc: "法人向け導入に強みを持つエンタープライズ特化型企業。",
    enDesc: "An enterprise-focused company strong in corporate deployments.",
  },
  titan_compute: {
    ja: "Titan Compute",
    en: "Titan Compute",
    jaDesc: "大規模インフラとGPUリソースを武器にするクラウド寄りの企業。",
    enDesc: "An infrastructure-heavy rival leaning on large-scale compute.",
  },
  deep_future: {
    ja: "DeepFuture",
    en: "DeepFuture",
    jaDesc: "急成長中のサブスクリプション特化型スタートアップ。",
    enDesc: "A fast-growing startup focused on subscription products.",
  },
};

/**
 * Phase 8 "Employee Assignment & Departments Foundation" (spec section 2-1):
 * names + short descriptions for the 9 required Departments. Numeric
 * per-head effect values live in data/balance.ts (read by
 * engine/departmentEffects.ts) - these descriptions are deliberately
 * qualitative (matching STAFF's style above), not string-interpolated with
 * live numbers.
 */
const DEPARTMENT: Record<string, Entry> = {
  research: {
    ja: "Research（研究）",
    en: "Research",
    jaDesc: "研究速度を引き上げ、将来的にモデル品質にも寄与する。",
    enDesc: "Speeds up research, and will factor into future model quality.",
  },
  data: {
    ja: "Data（データ）",
    en: "Data",
    jaDesc: "生データ収集・整備速度を引き上げる。",
    enDesc: "Speeds up raw data collection and refinement.",
  },
  infrastructure: {
    ja: "Infrastructure（インフラ）",
    en: "Infrastructure",
    jaDesc: "GPU運用効率（冷却）を引き上げ、将来的に故障・冷却リスクも低減する。",
    enDesc: "Improves GPU operating (cooling) efficiency, and will reduce failure/cooling risk in the future.",
  },
  sales: {
    ja: "Sales（営業）",
    en: "Sales",
    jaDesc: "API・サブスクリプションの成長を補助する。",
    enDesc: "Assists API and subscription growth.",
  },
  enterpriseSales: {
    ja: "Enterprise Sales（法人営業）",
    en: "Enterprise Sales",
    jaDesc: "Enterprise案件の契約成功時の報酬を引き上げる。",
    enDesc: "Increases the reward from successful Enterprise deal deliveries.",
  },
  finance: {
    ja: "Finance（財務）",
    en: "Finance",
    jaDesc: "支出を削減する。将来的に資金調達条件の改善にも寄与予定。",
    enDesc: "Reduces expenses. Planned to also improve future funding conditions.",
  },
  hr: {
    ja: "HR（人事）",
    en: "HR",
    jaDesc: "採用コストを削減する。将来的に士気・離職率にも寄与予定。",
    enDesc: "Reduces hiring costs. Planned to also affect future morale/turnover.",
  },
  legal: {
    ja: "Legal/Compliance（法務）",
    en: "Legal/Compliance",
    jaDesc: "Data Leak・PR Incidentのリスク低減指標（現在は表示のみ）。将来Enterprise契約成功率にも寄与予定。",
    enDesc: "A Data Leak / PR Incident risk-reduction indicator (display only for now). Planned to also affect future Enterprise deal success rate.",
  },
  customerSuccess: {
    ja: "Customer Success（カスタマーサクセス）",
    en: "Customer Success",
    jaDesc: "評判の上昇を補助する。将来的に解約率低減にも寄与予定。",
    enDesc: "Assists reputation growth. Planned to also reduce future churn.",
  },
};

const TABLES: Record<DisplayNameCategory, Record<string, Entry>> = {
  gpu: GPU,
  cooling: COOLING,
  facility: FACILITY,
  tech: TECH,
  model: MODEL,
  staff: STAFF,
  fundingRound: FUNDING_ROUND,
  enterpriseDeal: ENTERPRISE_DEAL,
  companyStrategy: COMPANY_STRATEGY,
  competitor: COMPETITOR,
  department: DEPARTMENT,
};

/** Display name for a data-constant id, in the given language. Falls back to the id itself if unknown. */
export function getDisplayName(category: DisplayNameCategory, id: string, language: Language): string {
  const entry = TABLES[category][id];
  if (!entry) return id;
  return language === "en" ? entry.en : entry.ja;
}

/** Optional flavor/effect description for a data-constant id, in the given language. */
export function getDisplayDescription(category: DisplayNameCategory, id: string, language: Language): string | undefined {
  const entry = TABLES[category][id];
  if (!entry) return undefined;
  return language === "en" ? entry.enDesc : entry.jaDesc;
}
