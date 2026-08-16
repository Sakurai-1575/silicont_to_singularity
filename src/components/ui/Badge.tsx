import type { ReactNode } from "react";
import type { Tone } from "./StatCard";

const TONE_CLASSES: Record<Tone, string> = {
  cyan: "border-cyan-dim text-cyan-neon",
  green: "border-green-dim text-green-neon",
  orange: "border-orange-dim text-orange-neon",
  danger: "border-danger-dim text-danger",
  warn: "border-warn-dim text-warn",
  neutral: "border-borderdim text-ink-dim",
};

/** A small pill label for status flags (locked / deployed / paused / etc). */
export function Badge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
