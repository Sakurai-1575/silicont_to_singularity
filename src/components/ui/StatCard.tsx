import type { ReactNode } from "react";

export type Tone = "cyan" | "green" | "orange" | "danger" | "warn" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  cyan: "text-cyan-neon",
  green: "text-green-neon",
  orange: "text-orange-neon",
  danger: "text-danger",
  warn: "text-warn",
  neutral: "text-ink-primary",
};

/** A boxed "instrument readout" tile - used in the header and resource panels for headline numbers. */
export function StatCard({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  sub?: ReactNode;
}) {
  return (
    <div className="min-w-[7rem] border border-borderdim bg-inset px-3 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`stat-huge text-lg leading-tight ${TONE_TEXT[tone]}`}>{value}</div>
      {sub && <div className="text-[10px] text-ink-dim">{sub}</div>}
    </div>
  );
}

/** A compact label:value line - used inside GamePanel bodies for dense stat lists. */
export function StatRow({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5 text-xs">
      <span className="text-ink-dim">{label}</span>
      <span className={`font-mono ${TONE_TEXT[tone]}`}>{value}</span>
    </div>
  );
}
