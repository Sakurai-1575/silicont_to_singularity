import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";
import { formatDuration } from "../game/utils/format";
import { GamePanel } from "./ui";

const TYPE_CLASSES: Record<string, string> = {
  info: "text-ink-primary",
  success: "text-green-neon",
  warning: "text-warn",
  error: "text-danger",
};

export default function EventLogPanel() {
  const t = useT();
  const eventLog = useGameStore((s) => s.eventLog);
  const recent = [...eventLog].reverse();

  return (
    <GamePanel title={t("log.title")} accent="neutral">
      <div className="max-h-64 space-y-0.5 overflow-y-auto text-xs">
        {recent.length === 0 && <div className="text-ink-muted">{t("log.empty")}</div>}
        {recent.map((event) => (
          <div key={event.id} className={TYPE_CLASSES[event.type] ?? "text-ink-primary"}>
            <span className="mr-2 font-mono text-ink-muted">[{formatDuration(event.time)}]</span>
            {event.message}
          </div>
        ))}
      </div>
    </GamePanel>
  );
}
