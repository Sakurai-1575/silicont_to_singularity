import { useEffect, type CSSProperties } from "react";
import { useCelebrationStore, type CelebrationKind, type CelebrationLevel } from "../app/celebrationStore";
import { useSettingsStore } from "../app/settingsStore";
import { getDisplayName } from "../game/i18n/dataNames";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { Icon, type IconKind } from "./ui";

/**
 * Phase 2 Polish (celebration overhaul spec section 1-1/1-2): banner
 * duration now scales with `level`, matching index.css's
 * `.celebration-banner-{normal,major,milestone}` animation-duration values
 * exactly (2.6s / 3s / 3.4s) - all within the requested ~2.5-3.5s range.
 * Kept as a lookup here (not read off the DOM) since the JS dismiss timer
 * and the CSS fade must agree independently of layout.
 */
const BANNER_DURATION_MS: Record<CelebrationLevel, number> = {
  // Phase 3.1 "Celebration Cleanup": ObjectiveWatcher.tsx now only ever
  // pushes "major"/"milestone" entries - "minor" and "normal" are unused
  // FROM OBJECTIVES specifically, but "normal" is still pushed directly by
  // unlockTech.ts, AchievementWatcher.tsx, and systemActions.ts's
  // modelComplete hook (tech unlocks/model completions/most achievements),
  // so both stay real, reachable tiers - kept for type completeness either way.
  minor: 2600,
  normal: 2600,
  major: 3000,
  milestone: 3400,
};

const KIND_ICON: Record<CelebrationKind, IconKind> = {
  techUnlock: "tech",
  modelComplete: "model",
  objectiveComplete: "objective",
  achievement: "achievement",
  // Phase 3 "AI Product Portfolio": reuses the "model" glyph for both
  // multiDeploy/revenueThreshold refIds - both are about the model
  // portfolio, and neither warrants a brand-new icon glyph.
  portfolioMilestone: "model",
  // Phase 6 "Milestone & Chapter Expansion Sprint": reuses the achievement
  // trophy glyph - visually distinct from objectiveComplete's flag icon,
  // signaling "bigger than a normal Objective" without a new SVG asset.
  milestone: "achievement",
};

const KIND_ACCENT: Record<CelebrationKind, string> = {
  techUnlock: "border-cyan-neon text-cyan-neon shadow-[0_0_40px_rgba(63,230,224,0.35)]",
  modelComplete: "border-green-neon text-green-neon shadow-[0_0_40px_rgba(77,255,158,0.35)]",
  objectiveComplete: "border-orange-neon text-orange-neon shadow-[0_0_40px_rgba(255,171,77,0.35)]",
  achievement: "border-orange-neon text-orange-neon shadow-[0_0_40px_rgba(255,171,77,0.35)]",
  portfolioMilestone: "border-green-neon text-green-neon shadow-[0_0_40px_rgba(77,255,158,0.35)]",
  // Phase 6: deliberately the same strong orange/gold treatment as
  // "achievement" - Milestones are meant to read as an even bigger sibling of
  // an achievement unlock, not a brand-new color language.
  milestone: "border-orange-neon text-orange-neon shadow-[0_0_50px_rgba(255,171,77,0.45)]",
};

/** Glow-wash tint (spec 1-2's "screen glow" for major/milestone), keyed by kind so it echoes the banner's own accent color. */
const KIND_GLOW: Record<CelebrationKind, string> = {
  techUnlock: "radial-gradient(ellipse at center, rgba(63, 230, 224, 0.18), transparent 62%)",
  modelComplete: "radial-gradient(ellipse at center, rgba(77, 255, 158, 0.18), transparent 62%)",
  objectiveComplete: "radial-gradient(ellipse at center, rgba(255, 171, 77, 0.18), transparent 62%)",
  achievement: "radial-gradient(ellipse at center, rgba(255, 171, 77, 0.18), transparent 62%)",
  portfolioMilestone: "radial-gradient(ellipse at center, rgba(77, 255, 158, 0.18), transparent 62%)",
  milestone: "radial-gradient(ellipse at center, rgba(255, 171, 77, 0.24), transparent 62%)",
};

/** Level-scaled box sizing/typography - "major"/"milestone" read as visibly bigger events per spec 1-2, without changing the shared layout grammar. */
const LEVEL_BOX: Record<CelebrationLevel, string> = {
  minor: "max-w-[90vw] gap-2 px-8 py-6 sm:max-w-sm",
  normal: "max-w-[90vw] gap-2 px-8 py-6 sm:max-w-sm",
  major: "max-w-[92vw] gap-2.5 px-10 py-7 sm:max-w-md",
  milestone: "max-w-[94vw] gap-3 px-12 py-9 sm:max-w-lg",
};
const LEVEL_ICON_BOX: Record<CelebrationLevel, string> = {
  minor: "h-14 w-14",
  normal: "h-14 w-14",
  major: "h-16 w-16",
  milestone: "h-20 w-20",
};
const LEVEL_ICON: Record<CelebrationLevel, string> = {
  minor: "h-8 w-8",
  normal: "h-8 w-8",
  major: "h-9 w-9",
  milestone: "h-11 w-11",
};
const LEVEL_NAME_TEXT: Record<CelebrationLevel, string> = {
  minor: "text-lg",
  normal: "text-lg",
  major: "text-xl",
  milestone: "text-2xl",
};
/** Particle count per level (spec 1-1's "light... particle-style effects" - kept deliberately small, not a real particle system). */
const LEVEL_PARTICLES: Record<CelebrationLevel, number> = {
  minor: 0,
  normal: 0,
  major: 5,
  milestone: 8,
};
/** Particle drift targets (CSS custom properties consumed by .celebration-particle's keyframe), spread in a rough ring around the banner. */
const PARTICLE_OFFSETS: Array<{ x: number; y: number; left: string; top: string; delay: string }> = [
  { x: -18, y: -34, left: "8%", top: "20%", delay: "0.05s" },
  { x: 22, y: -30, left: "90%", top: "15%", delay: "0.25s" },
  { x: -26, y: 10, left: "4%", top: "60%", delay: "0.45s" },
  { x: 30, y: 6, left: "94%", top: "55%", delay: "0.15s" },
  { x: -10, y: -40, left: "30%", top: "6%", delay: "0.55s" },
  { x: 12, y: -38, left: "70%", top: "4%", delay: "0.35s" },
  { x: -30, y: -10, left: "0%", top: "40%", delay: "0.65s" },
  { x: 28, y: -12, left: "98%", top: "35%", delay: "0.75s" },
];

function formatRewardParts(
  reward: { cash?: number; researchPoints?: number; reputation?: number; brand?: number } | undefined,
  fmt: ReturnType<typeof useNumberFormat>,
): string[] {
  if (!reward) return [];
  const parts: string[] = [];
  if (reward.cash) parts.push(`+${fmt.cash(reward.cash)}`);
  if (reward.researchPoints) parts.push(`+${reward.researchPoints} RP`);
  if (reward.reputation) parts.push(`+${reward.reputation} REP`);
  if (reward.brand) parts.push(`+${reward.brand} BRAND`);
  return parts;
}

/**
 * Central "big moment" overlay (Steam-quality UI/UX review sprint, section
 * 3.9/5, overhauled in Phase 2 Polish spec section 1-1/1-2). Mounted once
 * near the app root (see app/App.tsx), alongside
 * GlobalToast/AchievementWatcher/ObjectiveWatcher - this is a pure CONSUMER
 * of app/celebrationStore.ts's queue; it never touches GameState and decides
 * nothing about the simulation itself.
 *
 * Covers the 4 event kinds (tech unlock, model complete, Objective complete,
 * achievement unlock) - see celebrationStore.ts's doc comment for where each
 * is pushed. Shows ONE entry at a time (queue naturally serializes bursts)
 * and auto-advances after that entry's tier-scaled duration (see
 * BANNER_DURATION_MS, mirroring index.css's `.celebration-banner-*`
 * animation-duration values). Respects .no-animate (applied on App.tsx's
 * root div) automatically, since this component renders inside that same
 * subtree - see index.css's `.no-animate, .no-animate *` rule, which also
 * covers the new glow-wash/scanline-flash/particle layers below.
 *
 * Phase 2 Polish additions: `level` (minor/normal/major/milestone, see
 * celebrationStore.ts) now scales banner size, adds an optional full-
 * viewport glow wash + one-shot scanline flash for major/milestone, adds a
 * handful of drifting "particle" motes for major/milestone, and renders
 * reward chips (cash/RP/REP/BRAND) when the entry carries a `reward` -
 * currently only objectiveComplete entries populate that field. "minor"
 * entries are never actually pushed here in practice (ObjectiveWatcher.tsx
 * keeps those toast-only), but the component still renders something
 * reasonable for one defensively.
 */
export default function CelebrationBanner() {
  const t = useT();
  const fmt = useNumberFormat();
  const language = useSettingsStore((s) => s.language);
  const entry = useCelebrationStore((s) => s.queue[0] ?? null);
  const queueLength = useCelebrationStore((s) => s.queue.length);
  const shift = useCelebrationStore((s) => s.shift);

  useEffect(() => {
    if (!entry) return;
    // Phase 13.5 "Human Playtest Critical Fix Sprint" (spec 1-2): when a
    // backlog has built up behind this entry, drain the queue faster (half
    // duration, floored at 1.2s) instead of making the player wait through
    // every entry's full multi-second showcase - most relevant right after
    // an opening-minutes unlock burst.
    const baseDuration = BANNER_DURATION_MS[entry.level];
    const duration = queueLength > 2 ? Math.max(1200, Math.round(baseDuration / 2)) : baseDuration;
    const timer = window.setTimeout(() => shift(), duration);
    return () => window.clearTimeout(timer);
  }, [entry, queueLength, shift]);

  if (!entry) return null;

  const headline = t(`celebration.${entry.kind}`);
  const name =
    entry.kind === "techUnlock"
      ? getDisplayName("tech", entry.refId, language)
      : entry.kind === "modelComplete"
        ? getDisplayName("model", entry.refId, language)
        : entry.kind === "objectiveComplete"
          ? t(`objectives.items.${entry.refId}.title`)
          : entry.kind === "achievement"
            ? t(`achievements.items.${entry.refId}.title`)
            : entry.kind === "milestone"
              ? t(`milestones.items.${entry.refId}.title`)
              : t(`celebration.portfolio.${entry.refId}`);
  // Phase 6 "Milestone & Chapter Expansion Sprint": Milestones alone get an
  // extra flavor-text line under the name (spec's example: "TinyNet API is
  // now live. Your garage startup has become a real AI company.") - no other
  // kind has a per-entry description key to draw from.
  const milestoneDescription = entry.kind === "milestone" ? t(`milestones.items.${entry.refId}.description`) : null;

  const level = entry.level;
  const showGlow = level === "major" || level === "milestone";
  const particleCount = LEVEL_PARTICLES[level];
  const rewardParts = formatRewardParts(entry.reward, fmt);

  return (
    <div className="celebration-overlay">
      {showGlow && <div key={`${entry.id}_glow`} className="celebration-glow-wash" style={{ background: KIND_GLOW[entry.kind] }} />}
      {level === "milestone" && <div key={`${entry.id}_scan`} className="celebration-scanline-flash" />}
      <div
        key={entry.id}
        className={`celebration-banner celebration-banner-${level} pixel-frame relative flex w-full flex-col items-center text-center border-2 bg-void/[0.98] backdrop-blur-md ${LEVEL_BOX[level]} ${KIND_ACCENT[entry.kind]}`}
      >
        {Array.from({ length: particleCount }).map((_, i) => {
          const offset = PARTICLE_OFFSETS[i % PARTICLE_OFFSETS.length];
          return (
            <span
              key={`${entry.id}_p${i}`}
              className="celebration-particle"
              style={
                {
                  left: offset.left,
                  top: offset.top,
                  animationDelay: offset.delay,
                  "--particle-x": `${offset.x}px`,
                  "--particle-y": `${offset.y}px`,
                } as CSSProperties
              }
            />
          );
        })}
        <div className={`icon-frame shrink-0 ${LEVEL_ICON_BOX[level]}`}>
          <Icon kind={KIND_ICON[entry.kind]} className={LEVEL_ICON[level]} />
        </div>
        <div className="font-display text-[10px] uppercase tracking-widest">{headline}</div>
        <div className={`max-w-full break-words font-bold text-ink-primary ${LEVEL_NAME_TEXT[level]}`}>{name}</div>
        {milestoneDescription && (
          <div className="max-w-full break-words text-[11px] leading-snug text-ink-dim">{milestoneDescription}</div>
        )}
        {rewardParts.length > 0 && (
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="font-display text-[9px] uppercase tracking-widest text-ink-secondary">{t("celebration.reward")}</div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {rewardParts.map((part) => (
                <span key={part} className="stat-chip text-cyan-neon">
                  {part}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
