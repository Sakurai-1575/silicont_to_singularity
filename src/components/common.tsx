import { useState, type ReactNode } from "react";
import type { ActionResult } from "../game/types/game";

/**
 * Shared, presentation-only building blocks for the debug dashboard.
 * IMPORTANT: nothing in this file may perform game math - it only lays out
 * and formats values that are already computed by game/engine/*.
 */

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-100">{value}</span>
    </div>
  );
}

/**
 * A button that invokes a validated action and briefly surfaces its failure
 * reason (spec 21: "失敗時は理由を返す") inline, without touching GameState -
 * this feedback is purely a local UI concern.
 */
export function ActionButton({
  label,
  onAction,
  disabled,
  variant = "default",
}: {
  label: string;
  onAction: () => ActionResult<unknown> | void;
  disabled?: boolean;
  variant?: "default" | "danger" | "primary";
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

  const colors =
    variant === "danger"
      ? "bg-rose-900/60 hover:bg-rose-800 border-rose-700"
      : variant === "primary"
        ? "bg-emerald-900/60 hover:bg-emerald-800 border-emerald-700"
        : "bg-slate-800 hover:bg-slate-700 border-slate-700";

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`rounded border px-2.5 py-1.5 text-xs font-medium text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-40 ${colors}`}
      >
        {label}
      </button>
      {error && <span className="max-w-[14rem] text-[11px] leading-tight text-rose-400">{error}</span>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, colorClass = "bg-emerald-600" }: { value: number; max?: number; colorClass?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}
