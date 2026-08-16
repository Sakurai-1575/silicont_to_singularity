import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { useGameStore } from "../game/store/gameStore";
import { useSettingsStore } from "../app/settingsStore";
import { useT, type Language } from "../game/i18n";
import { getDisplayName, getDisplayDescription } from "../game/i18n/dataNames";
import { getTechLoreText } from "../game/i18n/techLore";
import { getTechDiscoveryState, type DiscoveryState } from "../game/engine/discovery";
import {
  getTechTreeLayout,
  getTechTreeWorldSize,
  getItemsUnlockedByTech,
  getChildTechIds,
  NODE_WIDTH,
  NODE_HEIGHT,
  type TechNodeLayout,
  type UnlockedItem,
} from "../game/engine/techTreeLayout";
import { AGI_TECH_ID } from "../game/engine/clear";
import type { TechCategory } from "../game/types/tech";
import { GameActionButton, Badge, Icon } from "./ui";
import type { ActionResult } from "../game/types/game";

/**
 * Phase 2 "Real Tech Tree UI" sprint: node-graph replacement for the old
 * card-grid TechPanel body. Vanilla SVG (connection lines) + absolutely
 * positioned HTML nodes inside a pan/zoom "world" div - explicitly permitted
 * for a 10-20 node tree instead of pulling in a graph-layout library (spec
 * section 3: "10〜20ノード程度ならvanilla SVG + CSS transformで実装してよい").
 *
 * Visual/discovery state reuses engine/discovery.ts exactly as the old
 * TechPanel did - this file adds ONE more distinction on top of it
 * (`available` vs `discoveredLocked`, split by RP affordability) because the
 * Phase 2 spec explicitly asks for both as separate node states; the actual
 * unlock action is still the same store.unlockTech() used before.
 *
 * Node/edge positions come from engine/techTreeLayout.ts (hand-placed
 * treePosition per tech, auto-grid fallback otherwise) - this component
 * never computes layout math itself, only reads it and draws it.
 */

export type NodeVisualState = "hidden" | "discoveredLocked" | "available" | "researched";

/** `text` is a Tailwind text-color utility (safe - `.game-card` never sets `color`); `line` is a raw CSS var string used for inline border-color and SVG stroke (see TechNode's doc comment for why border-color goes through inline style instead of a Tailwind `border-*` utility). */
const CATEGORY_STYLE: Record<TechCategory, { text: string; line: string }> = {
  ai_research: { text: "text-cyan-neon", line: "var(--neon-cyan)" },
  infrastructure: { text: "text-orange-neon", line: "var(--neon-orange)" },
  cooling: { text: "text-aqua-neon", line: "var(--neon-aqua)" },
  data: { text: "text-green-neon", line: "var(--neon-green)" },
  business: { text: "text-violet-neon", line: "var(--neon-violet)" },
  // Phase 9 "Research Expansion Foundation": 4 new categories, 4 new accent
  // tokens added to index.css's :root block (same additive pattern as the
  // Phase 2 aqua/violet pair) - `text-*-neon` utility classes for these
  // already resolve via Tailwind's arbitrary-value-free custom-color setup
  // the same way the 5 existing ones do (see tailwind.config.js).
  training_optimization: { text: "text-yellow-neon", line: "var(--neon-yellow)" },
  inference_optimization: { text: "text-magenta-neon", line: "var(--neon-magenta)" },
  energy: { text: "text-amber2-neon", line: "var(--neon-amber2)" },
  organization: { text: "text-blue-neon", line: "var(--neon-blue)" },
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 0.85;
const DEFAULT_PAN = { x: 24, y: 24 };

function getNodeVisualState(discovery: DiscoveryState, unlocked: boolean, affordable: boolean): NodeVisualState {
  if (unlocked) return "researched";
  if (discovery === "hidden") return "hidden";
  return affordable ? "available" : "discoveredLocked";
}

/**
 * Line stroke color/weight for an edge, derived from its TARGET node's
 * visual state (spec section 5, re-tuned in Phase 2 Polish spec 2-1 for
 * legibility: "researched routes should read as bright/emphasized,
 * available routes lightly glowing/pulsing, discoveredLocked dark-but-
 * visible, hidden thin dashed - lines shouldn't get lost behind nodes").
 * `width` and `glow` are new here - `glow` drives an inline SVG
 * `filter: drop-shadow(...)` on the line element (see the render below) so a
 * fully-researched path visually pops against the tree background even when
 * partially occluded by node cards drawn on top of it.
 */
function getLineColor(
  state: NodeVisualState,
  category: TechCategory,
): { stroke: string; opacity: number; dashed: boolean; pulse: boolean; width: number; glow: boolean } {
  if (state === "hidden") return { stroke: "var(--color-border)", opacity: 0.22, dashed: true, pulse: false, width: 1, glow: false };
  if (state === "discoveredLocked")
    return { stroke: "var(--color-border-bright)", opacity: 0.5, dashed: false, pulse: false, width: 1.5, glow: false };
  if (state === "available")
    return { stroke: CATEGORY_STYLE[category].line, opacity: 0.85, dashed: false, pulse: true, width: 2, glow: false };
  return { stroke: CATEGORY_STYLE[category].line, opacity: 1, dashed: false, pulse: false, width: 3, glow: true };
}

export default function TechTreeView() {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const researchPoints = useGameStore((s) => s.researchPoints);
  const unlockedTechIds = useGameStore((s) => s.unlockedTechIds);
  const unlockTech = useGameStore((s) => s.unlockTech);

  const layout = useMemo(() => getTechTreeLayout(), []);
  const world = useMemo(() => getTechTreeWorldSize(), []);

  // Per-node visual state + affordability, recomputed whenever unlocks/RP change.
  const nodeStates = useMemo(() => {
    const map = new Map<string, NodeVisualState>();
    for (const { spec } of layout) {
      const unlocked = unlockedTechIds.includes(spec.id);
      const discovery = getTechDiscoveryState(unlockedTechIds, spec.id);
      const affordable = researchPoints >= spec.costRp;
      map.set(spec.id, getNodeVisualState(discovery, unlocked, affordable));
    }
    return map;
  }, [layout, unlockedTechIds, researchPoints]);

  /**
   * Phase 2 Polish (spec 2-2): the single "best next thing to research"
   * right now - prefers an affordable ("available") node over one merely
   * unlocked-but-unaffordable ("discoveredLocked"), and NEVER a "hidden" one
   * (matches this file's existing no-spoiler contract - hidden nodes never
   * leak real data). Recomputed on every render (cheap - a handful of
   * nodes); used both to seed the initial detail-panel selection below and
   * to show a small "recommended" hint badge even after the player has
   * looked at something else.
   */
  const recommendedId = useMemo(() => {
    const available = layout.find((n) => nodeStates.get(n.spec.id) === "available");
    if (available) return available.spec.id;
    const discoveredLocked = layout.find((n) => nodeStates.get(n.spec.id) === "discoveredLocked");
    return discoveredLocked ? discoveredLocked.spec.id : null;
  }, [layout, nodeStates]);

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState(DEFAULT_PAN);
  const [isPanning, setIsPanning] = useState(false);
  // Phase 2 Polish (spec 2-2): the detail panel starts on the recommended
  // node instead of empty, when one exists. Lazy initializer so this only
  // runs once at mount - a later manual "close" (setSelectedId(null)) stays
  // respected and won't be fought by this on re-render.
  const [selectedId, setSelectedId] = useState<string | null>(() => recommendedId);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const initialPanRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Phase 2 Polish (spec 2-3): center the initially-researchable node(s) in
   * the viewport on first mount, instead of always starting at a fixed
   * top-left-biased pan. The viewport is fluid-width (flex layout), so a
   * hardcoded pixel target would be wrong on most screens - this measures
   * the actual rendered size and centers the average position of every
   * "available" node (falling back to the whole tree's centroid if none are
   * available yet, e.g. a brand-new save). Runs once on mount only -
   * re-centering every time RP/unlocks change would fight the player's own
   * panning. The resulting pan is remembered in initialPanRef so "reset
   * view" (below) returns HERE, not the old fixed DEFAULT_PAN - existing
   * zoom/pan interaction (wheel zoom, drag pan) is otherwise untouched.
   */
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || layout.length === 0) return;
    const rect = viewport.getBoundingClientRect();
    const available = layout.filter((n) => nodeStates.get(n.spec.id) === "available");
    const focusNodes = available.length > 0 ? available : layout;
    const avgX = focusNodes.reduce((sum, n) => sum + n.x + NODE_WIDTH / 2, 0) / focusNodes.length;
    const avgY = focusNodes.reduce((sum, n) => sum + n.y + NODE_HEIGHT / 2, 0) / focusNodes.length;
    const centeredPan = { x: rect.width / 2 - avgX * DEFAULT_ZOOM, y: rect.height / 2 - avgY * DEFAULT_ZOOM };
    initialPanRef.current = centeredPan;
    setPan(centeredPan);
    // Deliberately empty deps - once-only on mount, see doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.001)));
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
    },
    [pan],
  );

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }, []);

  const stopPanning = useCallback(() => {
    dragRef.current = null;
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    // Phase 2 Polish (spec 2-3): reset returns to the same well-centered
    // pan computed on mount (initialPanRef), not the old fixed DEFAULT_PAN -
    // falls back to DEFAULT_PAN only if the centering effect hasn't run yet
    // (shouldn't normally happen, since it runs synchronously via
    // useLayoutEffect before the user could click Reset).
    setPan(initialPanRef.current ?? DEFAULT_PAN);
  }, []);

  const selectedLayout = selectedId ? layout.find((n) => n.spec.id === selectedId) ?? null : null;
  const selectedState = selectedId ? nodeStates.get(selectedId) ?? "hidden" : null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.controlsHint")}</span>
          <button
            type="button"
            onClick={resetView}
            className="border border-borderdim px-1.5 py-0.5 text-[10px] text-ink-dim transition hover:border-cyan-dim hover:text-ink-primary"
          >
            {t("tech.reset")}
          </button>
        </div>

        <div
          ref={viewportRef}
          className={`tech-tree-viewport h-[420px] sm:h-[520px] ${isPanning ? "is-panning" : ""}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPanning}
          onPointerLeave={stopPanning}
        >
          <div
            className="tech-tree-world"
            style={{
              width: world.width,
              height: world.height,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg
              className="pointer-events-none absolute left-0 top-0"
              width={world.width}
              height={world.height}
              style={{ overflow: "visible" }}
            >
              {layout.map(({ spec, x, y }) =>
                spec.prerequisites.map((prereqId) => {
                  const prereq = layout.find((n) => n.spec.id === prereqId);
                  if (!prereq) return null;
                  const targetState = nodeStates.get(spec.id) ?? "hidden";
                  const line = getLineColor(targetState, spec.category);
                  const x1 = prereq.x + NODE_WIDTH / 2;
                  const y1 = prereq.y + NODE_HEIGHT / 2;
                  const x2 = x + NODE_WIDTH / 2;
                  const y2 = y + NODE_HEIGHT / 2;
                  return (
                    <line
                      key={`${prereqId}->${spec.id}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={line.stroke}
                      strokeOpacity={line.opacity}
                      strokeWidth={line.width}
                      strokeDasharray={line.dashed ? "4 5" : undefined}
                      strokeLinecap="round"
                      className={line.pulse ? "tech-line-available" : undefined}
                      style={line.glow ? { filter: `drop-shadow(0 0 3px ${line.stroke})` } : undefined}
                    />
                  );
                }),
              )}
            </svg>

            {layout.map((node) => (
              <TechNode
                key={node.spec.id}
                node={node}
                state={nodeStates.get(node.spec.id) ?? "hidden"}
                isTerminal={node.spec.id === AGI_TECH_ID}
                isSelected={node.spec.id === selectedId}
                language={language}
                t={t}
                onSelect={() => setSelectedId(node.spec.id)}
              />
            ))}
          </div>
        </div>

        <TechTreeLegend t={t} />
      </div>

      <TechDetailPanel
        layout={selectedLayout}
        state={selectedState}
        language={language}
        researchPoints={researchPoints}
        unlockedTechIds={unlockedTechIds}
        onUnlock={unlockTech}
        onClose={() => setSelectedId(null)}
        isRecommended={selectedId !== null && selectedId === recommendedId}
      />
    </div>
  );
}

/**
 * Phase 2 Polish (spec 2-4): a small, unobtrusive legend explaining the 4
 * node states, sitting below the viewport as a single compact row (not an
 * overlay on top of the tree, so it never competes with pan/zoom/click
 * interaction). Colors mirror TechNode's own state treatment - green for
 * researched, cyan pulse for available, dim border for discoveredLocked,
 * dashed muted for hidden - re-using the same tone tokens as .game-card's
 * accent classes rather than inventing new ones.
 */
function TechTreeLegend({ t }: { t: (key: string, vars?: Record<string, string | number>) => string }) {
  const items: Array<{ swatchClass: string; label: string }> = [
    { swatchClass: "bg-green-neon", label: t("common.unlocked") },
    { swatchClass: "bg-cyan-neon", label: t("tech.available") },
    { swatchClass: "bg-borderdim", label: t("tech.needsMoreRp") },
    { swatchClass: "bg-ink-muted opacity-50", label: t("discovery.undiscovered") },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[9px] text-ink-muted">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.swatchClass}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** One node card, absolutely positioned at its layout (x, y). Flashes briefly when it transitions into "researched" (spec section 10: "ノードにglow演出を付与"). */
function TechNode({
  node,
  state,
  isTerminal,
  isSelected,
  language,
  t,
  onSelect,
}: {
  node: TechNodeLayout;
  state: NodeVisualState;
  isTerminal: boolean;
  isSelected: boolean;
  language: Language;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onSelect: () => void;
}) {
  const { spec, x, y } = node;
  const wasResearched = useRef(state === "researched");
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    if (state === "researched" && !wasResearched.current) {
      setJustUnlocked(true);
      const timer = window.setTimeout(() => setJustUnlocked(false), 1400);
      wasResearched.current = true;
      return () => window.clearTimeout(timer);
    }
    wasResearched.current = state === "researched";
  }, [state]);

  const category = CATEGORY_STYLE[spec.category];

  // Deliberately NOT using Tailwind's `border-*`/`ring-*` utilities here:
  // `.game-card` (below) sets its own `border: ...` and `box-shadow: ...`
  // shorthand, and since that rule is declared AFTER `@tailwind utilities`
  // in index.css, it silently wins the cascade over same-specificity
  // Tailwind utility classes regardless of className order - the exact bug
  // class that made the CelebrationBanner render mid-page instead of fixed
  // (see index.css's `.celebration-overlay` comment). Border color/width go
  // through inline `style` instead (guaranteed to win over any stylesheet
  // rule), and "selected" uses the dedicated `.tech-node-selected` class
  // declared after `.game-card` in index.css so it wins by source order.
  const baseClasses = "tech-node game-card flex flex-col gap-1 p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-neon";

  if (state === "hidden") {
    return (
      <button
        type="button"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerDown={(e: PointerEvent<HTMLButtonElement>) => e.stopPropagation()}
        className={`${baseClasses} game-card-hidden text-left ${isSelected ? "tech-node-selected" : ""}`}
        style={{ left: x, top: y, width: NODE_WIDTH, height: NODE_HEIGHT, borderWidth: 2, borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-1.5">
          <Icon kind="unknown" className="h-5 w-5 shrink-0 text-ink-muted" />
          <span className="glitch-text truncate text-xs font-bold text-ink-muted">{t("discovery.unknown")}</span>
        </div>
        <Badge tone="neutral" icon="🔒">
          {t("discovery.undiscovered")}
        </Badge>
      </button>
    );
  }

  const stateBadge =
    state === "researched" ? (
      <Badge tone="green" icon="●">
        {t("common.unlocked")}
      </Badge>
    ) : state === "available" ? (
      <Badge tone="cyan">{t("tech.available")}</Badge>
    ) : (
      <Badge tone="neutral" icon="🔒">
        {t("tech.needsMoreRp")}
      </Badge>
    );

  return (
    <button
      type="button"
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => e.stopPropagation()}
      className={`${baseClasses} bg-void/90 text-left ${
        state === "available" ? "tech-node-available" : ""
      } ${isTerminal ? "tech-node-terminal" : ""} ${justUnlocked ? "tech-node-just-unlocked" : ""} ${
        isSelected ? "tech-node-selected" : ""
      } ${category.text}`}
      style={{ left: x, top: y, width: NODE_WIDTH, height: NODE_HEIGHT, borderWidth: 2, borderColor: category.line }}
    >
      <div className="flex items-center gap-1.5">
        <Icon kind={isTerminal ? "agi" : "tech"} className="h-5 w-5 shrink-0" />
        <span className="truncate text-xs font-bold">{getDisplayName("tech", spec.id, language)}</span>
      </div>
      <span className="line-clamp-2 text-[10px] leading-snug text-ink-dim">
        {getDisplayDescription("tech", spec.id, language)}
      </span>
      <div className="mt-auto flex items-center justify-between gap-1">
        {stateBadge}
        {state !== "researched" && <span className="stat-chip shrink-0 text-[10px] text-ink-primary">{spec.costRp} RP</span>}
      </div>
    </button>
  );
}

/** Right/bottom detail panel (spec section 9). Hidden techs get ONLY the generic placeholder copy - never real name/description/cost/prerequisites. */
function TechDetailPanel({
  layout,
  state,
  language,
  researchPoints,
  unlockedTechIds,
  onUnlock,
  onClose,
  isRecommended,
}: {
  layout: TechNodeLayout | null;
  state: NodeVisualState | null;
  language: Language;
  researchPoints: number;
  unlockedTechIds: string[];
  onUnlock: (id: string) => ActionResult<void>;
  onClose: () => void;
  /** Phase 2 Polish (spec 2-2): this node is the current "recommended next research" pick - shows a small hint badge so the auto-selected panel explains itself. */
  isRecommended?: boolean;
}) {
  const t = useT();

  if (!layout || !state) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 border border-borderdim bg-panel p-4 text-center text-xs text-ink-muted lg:w-72">
        {t("tech.detail.selectHint")}
      </div>
    );
  }

  const { spec } = layout;

  if (state === "hidden") {
    return (
      <div className="flex w-full flex-col gap-2 border border-borderdim bg-panel p-3 lg:w-72">
        <div className="flex items-center justify-between">
          <span className="glitch-text text-sm font-bold text-ink-muted">{t("tech.detail.hiddenName")}</span>
          <button type="button" onClick={onClose} className="text-[10px] text-ink-dim hover:text-ink-primary">
            {t("tech.detail.close")}
          </button>
        </div>
        <Badge tone="neutral" icon="🔒">
          {t("tech.detail.hiddenCategory")}
        </Badge>
        <p className="text-[11px] leading-snug text-ink-dim">{t("tech.detail.hiddenBody")}</p>
      </div>
    );
  }

  const missingPrereqs = spec.prerequisites.filter((id) => !unlockedTechIds.includes(id));
  const unlockedItems: UnlockedItem[] = getItemsUnlockedByTech(spec.id);
  const childTechIds = getChildTechIds(spec.id);
  const hasUnlocks = unlockedItems.length > 0 || childTechIds.length > 0;
  const historicalNote = getTechLoreText(spec.id, "historicalNote", language);
  const businessImpact = getTechLoreText(spec.id, "businessImpact", language);

  return (
    <div className="flex w-full flex-col gap-2 border border-borderdim bg-panel p-3 lg:w-72">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-ink-primary">{getDisplayName("tech", spec.id, language)}</span>
        <button type="button" onClick={onClose} className="shrink-0 text-[10px] text-ink-dim hover:text-ink-primary">
          {t("tech.detail.close")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="neutral">{t(`tech.categories.${spec.category}`)}</Badge>
        {isRecommended && state !== "researched" && <Badge tone="cyan">{t("tech.detail.recommended")}</Badge>}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.detail.effect")}</div>
        <p className="text-[11px] leading-snug text-ink-dim">{getDisplayDescription("tech", spec.id, language)}</p>
      </div>

      {/* Phase 2 Polish (spec 3-1/3-2): optional lore, only rendered when
          techLore.ts actually has an entry for this tech - most of the 10
          techs have at least one field, but neither is required, so this
          never shows an empty section. */}
      {historicalNote && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.detail.historicalNote")}</div>
          <p className="text-[11px] italic leading-snug text-ink-dim">{historicalNote}</p>
        </div>
      )}
      {businessImpact && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.detail.businessImpact")}</div>
          <p className="text-[11px] leading-snug text-ink-dim">{businessImpact}</p>
        </div>
      )}

      {spec.prerequisites.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.detail.requirements")}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {spec.prerequisites.map((id) => (
              <span
                key={id}
                className={`border px-1 py-0.5 text-[9px] ${
                  unlockedTechIds.includes(id) ? "border-green-dim text-green-neon" : "border-danger-dim text-danger"
                }`}
              >
                {unlockedTechIds.includes(id) ? "✓" : "→"} {getDisplayName("tech", id, language)}
              </span>
            ))}
          </div>
        </div>
      )}

      {state !== "researched" && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.detail.cost")}</span>
          <span className={`stat-chip ${researchPoints >= spec.costRp ? "text-ink-primary" : "text-danger"}`}>
            {spec.costRp} RP
          </span>
        </div>
      )}

      {hasUnlocks && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">{t("tech.detail.unlocksHeading")}</div>
          <div className="mt-1 flex flex-col gap-1.5">
            {unlockedItems.map((item) => {
              // Phase 2 Polish (spec 3-3): short flavor blurb for each
              // unlocked GPU/cooling/model, reusing the SAME bilingual
              // jaDesc/enDesc data i18n/dataNames.ts already carries for
              // equipment/model cards elsewhere (EquipmentCard/ModelCard) -
              // no new data needed, just surfaced here too.
              const flavor = getDisplayDescription(item.category, item.id, language);
              return (
                <div key={`${item.category}:${item.id}`} className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-ink-dim">
                    <Icon kind={item.category} className="h-3.5 w-3.5 shrink-0" />
                    {getDisplayName(item.category, item.id, language)}
                  </span>
                  {flavor && <span className="line-clamp-2 pl-[18px] text-[10px] leading-snug text-ink-muted">{flavor}</span>}
                </div>
              );
            })}
            {childTechIds.map((id) => (
              <span key={id} className="flex items-center gap-1 text-[11px] text-ink-dim">
                <Icon kind="tech" className="h-3.5 w-3.5 shrink-0" />
                {getDisplayName("tech", id, language)}
              </span>
            ))}
          </div>
        </div>
      )}

      {state !== "researched" && (
        <GameActionButton
          size="sm"
          label={t("tech.unlock")}
          onAction={() => onUnlock(spec.id)}
          disabled={missingPrereqs.length > 0}
          title={
            missingPrereqs.length > 0
              ? `${t("tech.needs")}: ${missingPrereqs.map((id) => getDisplayName("tech", id, language)).join(", ")}`
              : undefined
          }
          className="mt-1"
        />
      )}
    </div>
  );
}
