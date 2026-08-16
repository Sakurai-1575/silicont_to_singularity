import { useUiStore } from "../../app/uiStore";
import { useAchievementsStore } from "../../app/achievementsStore";
import { ACHIEVEMENT_IDS } from "../../game/data/achievements";
import { useT } from "../../game/i18n";
import { formatSavedAt } from "../../game/utils/format";
import { Modal, Badge } from "../ui";

/**
 * Simple achievement list UI (Feature Completion Sprint section 14 - "シンプル
 * な一覧UI"). Reads app/achievementsStore.ts directly rather than GameState,
 * so it shows the account's full unlock history even right after a "Reset
 * Game" wipes the current save.
 */
export default function AchievementsModal() {
  const t = useT();
  const closeModal = useUiStore((s) => s.closeModal);
  const unlocked = useAchievementsStore((s) => s.unlocked);

  const unlockedCount = unlocked.length;

  return (
    <Modal title={t("achievements.title")} onClose={closeModal} closeLabel={t("common.close")} widthClassName="max-w-xl">
      <p className="mb-3 text-[11px] text-ink-dim">
        {t("achievements.progress", { done: unlockedCount, total: ACHIEVEMENT_IDS.length })}
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {ACHIEVEMENT_IDS.map((id) => {
          const entry = unlocked.find((u) => u.id === id);
          const isUnlocked = !!entry;
          return (
            <div
              key={id}
              className={`border p-2 ${isUnlocked ? "border-orange-dim bg-orange-dim/10" : "border-borderdim bg-panel-raised opacity-70"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold ${isUnlocked ? "text-orange-neon" : "text-ink-muted"}`}>
                  {t(`achievements.items.${id}.title`)}
                </span>
                <Badge tone={isUnlocked ? "orange" : "neutral"} icon={isUnlocked ? "🏆" : "🔒"}>
                  {isUnlocked ? t("common.unlocked") : t("common.locked")}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-ink-dim">{t(`achievements.items.${id}.desc`)}</p>
              {entry && <p className="mt-1 text-[10px] text-ink-muted">{formatSavedAt(entry.unlockedAt)}</p>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
