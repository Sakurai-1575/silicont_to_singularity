import type { ReactNode } from "react";
import { Icon, type IconKind } from "./Icon";
import { GameActionButton, type ButtonVariant } from "./GameButton";
import { ProgressBar } from "./ProgressBar";
import { Badge } from "./Badge";
import type { ActionResult } from "../../game/types/game";

export type ModelStat = { label: string; value: ReactNode };

/**
 * Shared "model card" used by TrainingPanel.tsx for trainable, in-progress,
 * and completed models (UI Professional Polish Sprint section 4). One shape
 * covers all three states via optional props (progress/statusBadges) rather
 * than three separate layouts, so a card visually reads the same everywhere
 * a model appears. `terminal` triggers the special AGI-tier glow (see
 * .game-card-terminal in index.css) - purely a display flag the caller sets
 * for the agi_omni_100t spec id, no logic here.
 */
export function ModelCard({
  icon = "model",
  name,
  description,
  stats,
  locked,
  lockReason,
  statusBadges,
  actionLabel,
  onAction,
  actionDisabled,
  actionVariant = "primary",
  progress,
  glow,
  terminal,
  children,
  hidden,
  hiddenLabel,
  hiddenBadgeText,
}: {
  icon?: IconKind;
  name: string;
  description?: string;
  stats: ModelStat[];
  locked?: boolean;
  lockReason?: string;
  statusBadges?: ReactNode;
  actionLabel?: string;
  onAction?: () => ActionResult<unknown> | void;
  actionDisabled?: boolean;
  actionVariant?: ButtonVariant;
  progress?: number;
  glow?: boolean;
  terminal?: boolean;
  children?: ReactNode;
  /** Discovery System (Steam-quality UI/UX review sprint, section 3.2/3.4) - see EquipmentCard's identical prop doc comment. */
  hidden?: boolean;
  hiddenLabel?: string;
  hiddenBadgeText?: string;
}) {
  if (hidden) {
    return (
      <div className="game-card game-card-hidden flex flex-col gap-2.5 p-3">
        <div className="flex items-start gap-3">
          <div className="icon-frame h-12 w-12 shrink-0 text-ink-muted">
            <Icon kind="unknown" className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="glitch-text truncate text-sm font-bold text-ink-muted">{hiddenLabel ?? "???"}</h3>
          </div>
        </div>
        <Badge tone="neutral" icon="🔒">
          {hiddenBadgeText ?? "???"}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={`game-card flex flex-col gap-2.5 p-3 ${
        locked ? "game-card-locked" : terminal ? "game-card-terminal" : glow ? "game-card-available" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`icon-frame h-12 w-12 shrink-0 ${locked ? "text-ink-muted" : terminal ? "text-orange-neon" : "text-green-neon"}`}>
          <Icon kind={locked ? icon : terminal ? "agi" : icon} className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-sm font-bold ${terminal ? "text-orange-neon" : "text-ink-primary"}`}>{name}</h3>
          {description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-dim">{description}</p>}
        </div>
      </div>

      {typeof progress === "number" && (
        <div>
          <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
            <span className="text-ink-dim">PROGRESS</span>
            <span className="stat-huge text-green-neon">{progress.toFixed(1)}%</span>
          </div>
          <ProgressBar value={progress} tone="green" className="h-3.5" />
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {stats.map((s, i) => (
          <span key={i} className="stat-chip text-ink-primary">
            <span className="text-ink-muted">{s.label}</span> {s.value}
          </span>
        ))}
      </div>

      {locked && lockReason && <div className="text-[11px] text-ink-muted">🔒 {lockReason}</div>}
      {statusBadges}
      {children}

      {actionLabel && onAction && (
        <div className="mt-auto pt-1">
          <GameActionButton
            size="sm"
            variant={actionVariant}
            label={actionLabel}
            disabled={locked || actionDisabled}
            onAction={onAction}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
