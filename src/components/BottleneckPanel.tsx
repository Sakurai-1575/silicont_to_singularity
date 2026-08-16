import { useGameStore } from "../game/store/gameStore";
import { getCurrentBottlenecks } from "../game/engine/bottlenecks";
import type { BottleneckId } from "../game/types/progression";
import { useT } from "../game/i18n";

const ICON: Record<BottleneckId, string> = {
  power: "⚡",
  cooling: "❄",
  data: "📊",
  vram: "💾",
  research_points: "🔬",
  cash: "💰",
  inference_compute: "🌐",
  training_compute: "🧠",
};

/**
 * "現在のボトルネック" as a compact warning-chip stack (UI Professional Polish
 * Sprint section 8: "bottlenecks shown as warning chips"). Previously a full
 * GamePanel rendered below the Base View click area; now a small
 * pointer-events-auto chip stack meant to be overlaid in BaseView.tsx's
 * top-right HUD corner so it doesn't compete with the background photo for
 * space. Self-contained (reads GameState itself) so it can still be dropped
 * anywhere. Renders nothing when there are no active bottlenecks - the "all
 * clear" state is silence, not another badge, since this now lives directly
 * on top of the background image.
 */
export default function BottleneckPanel() {
  const t = useT();
  const state = useGameStore((s) => s);
  const bottlenecks = getCurrentBottlenecks(state);

  if (bottlenecks.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {bottlenecks.map((b) => (
        <div
          key={b.id}
          className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] backdrop-blur-sm ${
            b.severity === "critical"
              ? "border-danger bg-danger-dim/30 text-danger animate-pulse-glow"
              : "border-warn-dim bg-warn-dim/25 text-warn"
          }`}
          title={t(`bottleneck.items.${b.id}`)}
        >
          <span>{ICON[b.id]}</span>
          <span className="max-w-[140px] truncate">{t(`bottleneck.items.${b.id}`)}</span>
        </div>
      ))}
    </div>
  );
}
