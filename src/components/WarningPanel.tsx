import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";
import { GamePanel } from "./ui";

/** Warnings a bit more severe than the norm get a red treatment instead of amber. */
const SEVERE_IDS = new Set(["meltdown_risk", "acquisition_risk", "gross_margin_critical"]);

export default function WarningPanel() {
  const t = useT();
  const warnings = useGameStore((s) => s.warnings);

  if (warnings.length === 0) return null;

  return (
    <GamePanel title={t("warnings.title")} accent="orange" className="border-warn-dim">
      <ul className="flex flex-col gap-1">
        {warnings.map((w) => {
          const severe = SEVERE_IDS.has(w.id);
          return (
            <li
              key={w.id}
              className={`flex items-center gap-2 border px-2 py-1 text-xs ${
                severe ? "border-danger-dim bg-danger-dim/15 text-danger" : "border-warn-dim bg-warn-dim/15 text-warn"
              }`}
            >
              <span aria-hidden>⚠</span>
              <span>{t(`warnings.items.${w.id}`)}</span>
            </li>
          );
        })}
      </ul>
    </GamePanel>
  );
}
