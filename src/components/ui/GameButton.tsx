import { useState, type ReactNode } from "react";
import type { ActionResult } from "../../game/types/game";

export type ButtonVariant = "default" | "primary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "border-borderbright bg-panel-raised text-ink-primary hover:border-cyan-neon hover:text-cyan-neon",
  primary: "border-green-dim bg-panel-raised text-green-neon hover:bg-green-dim/20 hover:border-green-neon",
  danger: "border-danger-dim bg-panel-raised text-danger hover:bg-danger-dim/30 hover:border-danger",
  ghost: "border-transparent bg-transparent text-ink-dim hover:text-ink-primary hover:border-borderdim",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-[11px]",
  md: "px-3 py-1.5 text-xs",
};

/**
 * Base game-styled button. Real <button> element throughout so keyboard
 * (Enter/Space/Tab) works with no extra wiring.
 */
export function GameButton({
  children,
  onClick,
  disabled,
  variant = "default",
  size = "md",
  title,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`border font-body font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-neon disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Wraps GameButton with the store's "validate -> ActionResult" convention
 * (spec section 21): on failure, the reason is surfaced inline for a few
 * seconds instead of the action silently doing nothing. This is the direct
 * successor to the old ActionButton in components/common.tsx.
 */
export function GameActionButton({
  label,
  onAction,
  disabled,
  variant = "default",
  size = "md",
  title,
  className = "",
}: {
  label: ReactNode;
  onAction: () => ActionResult<unknown> | void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    const result = onAction();
    if (result && result.success === false) {
      setError(result.reason);
      window.setTimeout(() => setError(null), 4000);
    } else {
      setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <GameButton onClick={handleClick} disabled={disabled} variant={variant} size={size} title={title} className={className}>
        {label}
      </GameButton>
      {error && <span className="max-w-[16rem] text-[10px] leading-tight text-danger">{error}</span>}
    </div>
  );
}
