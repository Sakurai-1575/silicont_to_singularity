import { useMemo, useState, type ChangeEvent, type FocusEvent } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useUiStore } from "../../app/uiStore";
import { useSettingsStore } from "../../app/settingsStore";
import { useT } from "../../game/i18n";
import { useNumberFormat } from "../../app/useFormat";
import { listSaveSlots, type SaveSlotInfo } from "../../game/utils/save";
import { SAVE_SLOT_COUNT, AUTO_SAVE_SLOT } from "../../game/types/game";
import { formatSavedAt } from "../../game/utils/format";
import { playSound } from "../../game/services/audio";
import { Modal, GameButton, Badge } from "../ui";

/**
 * Save/Load UI (spec: Auto Save indicator, Manual Save, Load Save, Export
 * Save, Import Save, Reset Game, per-slot summary). Reachable from both the
 * Title screen ("Load Game") and the in-game header - Load always calls
 * goToGame() too, which is a no-op if already in-game.
 */
export default function SaveLoadModal() {
  const t = useT();
  const fmt = useNumberFormat();
  const closeModal = useUiStore((s) => s.closeModal);
  const goToGame = useUiStore((s) => s.goToGame);
  const autoSaveEnabled = useSettingsStore((s) => s.autoSaveEnabled);

  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const deleteSlot = useGameStore((s) => s.deleteSlot);
  const exportSave = useGameStore((s) => s.exportSave);
  const importSave = useGameStore((s) => s.importSave);
  const resetGame = useGameStore((s) => s.resetGame);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const slots = useMemo<(SaveSlotInfo | null)[]>(() => listSaveSlots(), [refreshKey]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [exportText, setExportText] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleLoad = (slot: number) => {
    const result = loadFromSlot(slot);
    if (result.success) {
      setLoadError(null);
      closeModal();
      goToGame();
    } else {
      setLoadError(result.reason);
    }
  };

  const handleSave = (slot: number) => {
    saveToSlot(slot);
    playSound("save");
    refresh();
  };

  const handleDelete = (slot: number) => {
    if (confirmDeleteSlot !== slot) {
      setConfirmDeleteSlot(slot);
      window.setTimeout(() => setConfirmDeleteSlot((cur) => (cur === slot ? null : cur)), 4000);
      return;
    }
    deleteSlot(slot);
    setConfirmDeleteSlot(null);
    refresh();
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    resetGame();
    setConfirmReset(false);
    refresh();
  };

  const handleExport = () => {
    setExportText(exportSave());
  };

  const handleImport = () => {
    const result = importSave(importText);
    if (result.success) {
      setImportMessage({ ok: true, text: t("saveload.importSuccess") });
      setImportText("");
      refresh();
    } else {
      setImportMessage({ ok: false, text: `${t("saveload.importErrorPrefix")} ${result.reason}` });
    }
  };

  return (
    <Modal title={t("saveload.title")} onClose={closeModal} closeLabel={t("common.close")} widthClassName="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={autoSaveEnabled ? "green" : "neutral"}>
            {t("settings.autoSave")}: {t(autoSaveEnabled ? "settings.on" : "settings.off")}
          </Badge>
          <GameButton size="sm" variant="primary" onClick={() => handleSave(AUTO_SAVE_SLOT)}>
            {t("header.manualSave")}
          </GameButton>
          <GameButton size="sm" variant={confirmReset ? "danger" : "default"} onClick={handleReset}>
            {confirmReset ? `${t("common.confirm")}?` : t("saveload.resetGame")}
          </GameButton>
        </div>

        {loadError && <p className="text-xs text-danger">{loadError}</p>}

        <div className="flex flex-col gap-2">
          {Array.from({ length: SAVE_SLOT_COUNT }, (_, slot) => slot).map((slot) => {
            const info = slots[slot];
            return (
              <div key={slot} className="border border-borderdim bg-panel-raised p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-display text-[10px] text-cyan-neon">
                    {slot === AUTO_SAVE_SLOT ? t("saveload.autoSlotLabel") : t("saveload.slot", { n: slot })}
                    {info?.summary.isGameCleared && (
                      <Badge tone="green" icon="🎉">
                        {t("clear.title")}
                      </Badge>
                    )}
                    {info?.summary.isBankrupt && (
                      <Badge tone="danger" icon="⚠">
                        {t("bankruptcy.title")}
                      </Badge>
                    )}
                  </span>
                  <div className="flex gap-1.5">
                    <GameButton size="sm" onClick={() => handleSave(slot)}>
                      {t("saveload.save")}
                    </GameButton>
                    {info && (
                      <>
                        <GameButton size="sm" variant="primary" onClick={() => handleLoad(slot)}>
                          {t("saveload.load")}
                        </GameButton>
                        <GameButton
                          size="sm"
                          variant={confirmDeleteSlot === slot ? "danger" : "ghost"}
                          onClick={() => handleDelete(slot)}
                        >
                          {confirmDeleteSlot === slot ? `${t("common.confirm")}?` : t("saveload.delete")}
                        </GameButton>
                      </>
                    )}
                  </div>
                </div>

                {info ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-ink-dim sm:grid-cols-3">
                    <span>
                      {t("saveload.savedAt")}: <span className="text-ink-primary">{formatSavedAt(info.savedAt)}</span>
                    </span>
                    <span>
                      {t("saveload.gameTime")}:{" "}
                      <span className="text-ink-primary">{Math.floor(info.summary.gameTimeSeconds)}s</span>
                    </span>
                    <span>
                      {t("resource.cash")}: <span className="text-ink-primary">{fmt.cash(info.summary.cash)}</span>
                    </span>
                    <span>
                      {t("resource.valuation")}:{" "}
                      <span className="text-ink-primary">{fmt.cash(info.summary.valuation)}</span>
                    </span>
                    <span>
                      {t("resource.equity")}:{" "}
                      <span className="text-ink-primary">{info.summary.equity.toFixed(1)}%</span>
                    </span>
                    <span>
                      {t("saveload.highestModel")}:{" "}
                      <span className="text-ink-primary">{info.summary.highestModelName ?? t("common.none")}</span>
                    </span>
                    <span>
                      {t("saveload.completedModels")}:{" "}
                      <span className="text-ink-primary">{info.summary.completedModelCount}</span>
                    </span>
                    <span>
                      {t("saveload.facility")}: <span className="text-ink-primary">{info.summary.facilityName}</span>
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-ink-muted">{t("saveload.empty")}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-borderdim pt-3 sm:grid-cols-2">
          <div>
            <GameButton size="sm" className="w-full" onClick={handleExport}>
              {t("saveload.exportSave")}
            </GameButton>
            {exportText !== null && (
              <textarea
                readOnly
                value={exportText}
                onFocus={(e: FocusEvent<HTMLTextAreaElement>) => e.currentTarget.select()}
                className="mt-2 h-24 w-full resize-none border border-borderdim bg-inset p-1.5 font-mono text-[10px] text-ink-dim"
              />
            )}
          </div>
          <div>
            <textarea
              value={importText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImportText(e.target.value)}
              placeholder={t("saveload.importPlaceholder")}
              className="h-24 w-full resize-none border border-borderdim bg-inset p-1.5 font-mono text-[10px] text-ink-primary placeholder:text-ink-muted"
            />
            <GameButton size="sm" className="mt-2 w-full" onClick={handleImport} disabled={!importText.trim()}>
              {t("saveload.importButton")}
            </GameButton>
            {importMessage && (
              <p className={`mt-1 text-[11px] ${importMessage.ok ? "text-green-neon" : "text-danger"}`}>
                {importMessage.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
