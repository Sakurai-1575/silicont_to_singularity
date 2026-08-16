import type { ReactNode } from "react";
import { Icon, type IconKind } from "./Icon";
import { GameActionButton, type ButtonVariant } from "./GameButton";
import { Badge } from "./Badge";
import type { ActionResult } from "../../game/types/game";

export type EquipmentStat = { label: string; value: ReactNode };

/**
 * Shared "equipment shop" card used by HardwarePanel.tsx for GPUs, cooling
 * units, and facility upgrades (UI Professional Polish Sprint section 3) -
 * one component so all three sections share the exact same visual grammar
 * (icon slot, name, owned/status badges, stat chips, buy button) instead of
 * three near-duplicate hand-rolled layouts. Purely presentational: every
 * prop is either display data or a callback already validated upstream by
 * the calling action (buyGpu/buyCooling/upgradeFacility) - no game math
 * lives here.
 */
export function EquipmentCard({
  icon,
  name,
  description,
  ownedCount,
  priceLabel,
  stats,
  locked,
  lockReason,
  statusBadge,
  actionLabel,
  onAction,
  actionDisabled,
  actionVariant = "primary",
  glow,
  hidden,
  hiddenLabel,
  hiddenBadgeText,
}: {
  icon: IconKind;
  name: string;
  description?: string;
  ownedCount?: number;
  priceLabel: string;
  stats: EquipmentStat[];
  locked?: boolean;
  lockReason?: string;
  statusBadge?: ReactNode;
  actionLabel?: string;
  onAction?: () => ActionResult<unknown> | void;
  actionDisabled?: boolean;
  actionVariant?: ButtonVariant;
  glow?: boolean;
  /**
   * Discovery System (Steam-quality UI/UX review sprint, section 3.2): when
   * true, every real-data prop above (name/description/stats/priceLabel/
   * ownedCount) is IGNORED and a fully obscured "???" card renders instead -
   * this is the "hidden" discovery tier, stricter than `locked` (which still
   * shows full details, just disables the action). Caller still must pass
   * `name`/`priceLabel`/`stats` (TypeScript requires them) but their values
   * are never read when hidden is true; passing empty placeholders is fine.
   * `hiddenLabel` defaults to "???" (the headline); `hiddenBadgeText` is the
   * small badge caption (e.g. "未発見" / "Undiscovered") - deliberately a
   * SEPARATE, generic string from any real requirement/tech name, since the
   * whole point of "hidden" is that no future tech/item name leaks here.
   */
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
      className={`game-card flex flex-col gap-2.5 p-3 ${locked ? "game-card-locked" : glow ? "game-card-available" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`icon-frame h-12 w-12 shrink-0 ${locked ? "text-ink-muted" : "text-cyan-neon"}`}>
          <Icon kind={icon} className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-ink-primary">{name}</h3>
            {typeof ownedCount === "number" && ownedCount > 0 && (
              <span className="shrink-0 border border-green-dim bg-green-dim/15 px-1.5 py-0.5 font-mono text-[10px] text-green-neon">
                x{ownedCount}
              </span>
            )}
          </div>
          {description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-dim">{description}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {stats.map((s, i) => (
          <span key={i} className="stat-chip text-ink-primary">
            <span className="text-ink-muted">{s.label}</span> {s.value}
          </span>
        ))}
      </div>

      {locked && lockReason && (
        <Badge tone="neutral" icon="🔒">
          {lockReason}
        </Badge>
      )}
      {statusBadge}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-borderdim pt-2">
        <span className="stat-huge text-sm text-cyan-neon">{priceLabel}</span>
        {actionLabel && onAction && (
          <GameActionButton
            size="sm"
            variant={actionVariant}
            label={actionLabel}
            disabled={locked || actionDisabled}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
}
