import { useRef, useState, type FocusEvent } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";
import { GamePanel, GameActionButton, GameButton } from "./ui";
import DebugPanel from "./DebugPanel";

/**
 * Dev Tools panel (spec 24.3): debug cheats + the raw state dump, both
 * folded into one collapsed-by-default panel so the normal player-facing
 * screens never read as a "debug dashboard". Hidden automatically in
 * production builds via Vite's import.meta.env.DEV flag - `npm run build`
 * sets this to false, so this whole panel (and its logic) is tree-shaken out
 * of the production bundle without any manual toggling needed.
 */
export default function CheatPanel() {
  const t = useT();
  const cheatAddCash = useGameStore((s) => s.cheatAddCash);
  const cheatAddRawData = useGameStore((s) => s.cheatAddRawData);
  const cheatAddCleanData = useGameStore((s) => s.cheatAddCleanData);
  const cheatAddResearchPoints = useGameStore((s) => s.cheatAddResearchPoints);
  const cheatUnlockAllTech = useGameStore((s) => s.cheatUnlockAllTech);
  const cheatFastForward = useGameStore((s) => s.cheatFastForward);
  const resetGame = useGameStore((s) => s.resetGame);
  const exportSave = useGameStore((s) => s.exportSave);
  const importSave = useGameStore((s) => s.importSave);

  const [expanded, setExpanded] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const importRef = useRef<HTMLTextAreaElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!import.meta.env.DEV) return null;

  return (
    <GamePanel
      title={t("cheat.title")}
      accent="orange"
      className="border-orange-dim"
      headerRight={
        <GameButton size="sm" variant="ghost" onClick={() => setExpanded((e) => !e)}>
          {expanded ? t("cheat.collapse") : t("cheat.expand")}
        </GameButton>
      }
    >
      <p className="mb-2 text-[11px] text-ink-muted">{t("cheat.subtitle")}</p>

      {expanded && (
        <>
          <div className="flex flex-wrap gap-2">
            <GameActionButton size="sm" label="+ $10K" onAction={() => cheatAddCash(10000)} />
            <GameActionButton size="sm" label="+ $1M" onAction={() => cheatAddCash(1000000)} />
            <GameActionButton size="sm" label="+ 100TB Raw" onAction={() => cheatAddRawData(100)} />
            <GameActionButton size="sm" label="+ 100TB Clean" onAction={() => cheatAddCleanData(100)} />
            <GameActionButton size="sm" label="+ 100 RP" onAction={() => cheatAddResearchPoints(100)} />
            <GameActionButton size="sm" label="+ 10,000 RP" onAction={() => cheatAddResearchPoints(10000)} />
            <GameActionButton size="sm" label="Unlock All Tech" onAction={() => cheatUnlockAllTech()} />
            <GameActionButton size="sm" label="FF 60s" onAction={() => cheatFastForward(60)} />
            <GameActionButton size="sm" label="FF 600s" onAction={() => cheatFastForward(600)} />
            <GameActionButton size="sm" variant="danger" label={t("saveload.resetGame")} onAction={() => resetGame()} />
            <GameActionButton size="sm" label={t("saveload.exportSave")} onAction={() => setExported(exportSave())} />
          </div>

          {exported && (
            <textarea
              readOnly
              value={exported}
              className="mt-2 h-24 w-full resize-none border border-borderdim bg-inset p-1.5 font-mono text-[10px] text-ink-dim"
              onFocus={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.select()}
            />
          )}

          <div className="mt-3">
            <textarea
              ref={importRef}
              placeholder={t("saveload.importPlaceholder")}
              className="h-24 w-full resize-none border border-borderdim bg-inset p-1.5 font-mono text-[10px] text-ink-primary placeholder:text-ink-muted"
            />
            <div className="mt-1 flex items-center gap-2">
              <GameActionButton
                size="sm"
                label={t("saveload.importButton")}
                onAction={() => {
                  const json = importRef.current?.value ?? "";
                  const result = importSave(json);
                  if (!result.success) setImportError(result.reason);
                  else setImportError(null);
                  return result;
                }}
              />
              {importError && <span className="text-[11px] text-danger">{importError}</span>}
            </div>
          </div>

          <div className="my-3 border-t border-borderdim" />
          <DebugPanel />
        </>
      )}
    </GamePanel>
  );
}
