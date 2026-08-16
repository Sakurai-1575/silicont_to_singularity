import type { ReactNode } from "react";

export type Accent = "cyan" | "green" | "orange" | "danger" | "neutral";

const ACCENT_TEXT: Record<Accent, string> = {
  cyan: "text-cyan-neon",
  green: "text-green-neon",
  orange: "text-orange-neon",
  danger: "text-danger",
  neutral: "text-ink-dim",
};

const ACCENT_BORDER: Record<Accent, string> = {
  cyan: "border-cyan-dim",
  green: "border-green-dim",
  orange: "border-orange-dim",
  danger: "border-danger-dim",
  neutral: "border-borderdim",
};

/** A small uppercase pixel-font label used to title panels and sub-sections. */
export function SectionHeader({
  title,
  accent = "neutral",
  right,
}: {
  title: string;
  accent?: Accent;
  right?: ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 border-b pb-1.5 ${ACCENT_BORDER[accent]}`}>
      <h2 className={`font-display text-[10px] uppercase tracking-wider ${ACCENT_TEXT[accent]}`}>{title}</h2>
      {right && <div className="text-[11px] text-ink-dim">{right}</div>}
    </div>
  );
}
