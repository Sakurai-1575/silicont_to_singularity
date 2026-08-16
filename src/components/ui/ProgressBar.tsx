import type { Tone } from "./StatCard";

const TONE_BG: Record<Tone, string> = {
  cyan: "bg-cyan-neon",
  green: "bg-green-neon",
  orange: "bg-orange-neon",
  danger: "bg-danger",
  warn: "bg-warn",
  neutral: "bg-ink-dim",
};

/** A stepped-look horizontal meter. `value`/`max` are display inputs only - no game math here. */
export function ProgressBar({
  value,
  max = 100,
  tone = "cyan",
  className = "",
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  return (
    <div className={`h-2.5 w-full overflow-hidden border border-borderdim bg-inset ${className}`}>
      <div className={`h-full ${TONE_BG[tone]} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}
