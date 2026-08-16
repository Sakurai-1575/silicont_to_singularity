import { useState, type ChangeEvent } from "react";
import { useSettingsStore } from "../../app/settingsStore";
import { useUiStore } from "../../app/uiStore";
import { useT } from "../../game/i18n";
import { getAudioSettings, setAudioSettings } from "../../game/services/audio";
import { Modal, GameButton, SectionHeader } from "../ui";

/**
 * Settings modal (spec: Language / Number format / Animations / Autosave /
 * CheatPanel visibility). CheatPanel visibility has no toggle - it's
 * structurally dev-only (import.meta.env.DEV, see components/CheatPanel.tsx)
 * - this row is informational only, per spec "Dev限定".
 */
export default function SettingsModal() {
  const t = useT();
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const setNumberFormat = useSettingsStore((s) => s.setNumberFormat);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const setAnimationsEnabled = useSettingsStore((s) => s.setAnimationsEnabled);
  const autoSaveEnabled = useSettingsStore((s) => s.autoSaveEnabled);
  const setAutoSaveEnabled = useSettingsStore((s) => s.setAutoSaveEnabled);

  // Audio settings (Feature Completion Sprint section 16) are deliberately
  // NOT in useSettingsStore - see game/services/audio.ts's doc comment -
  // so they're mirrored into local component state here rather than read
  // through a Zustand hook.
  const [audio, setAudio] = useState(getAudioSettings());
  const updateAudio = (next: Parameters<typeof setAudioSettings>[0]) => {
    setAudioSettings(next);
    setAudio(getAudioSettings());
  };

  return (
    <Modal title={t("settings.title")} onClose={closeModal} closeLabel={t("common.close")}>
      <div className="flex flex-col gap-4">
        <section>
          <SectionHeader title={t("settings.language")} accent="cyan" />
          <div className="mt-2 flex gap-2">
            <GameButton variant={language === "ja" ? "primary" : "default"} size="sm" onClick={() => setLanguage("ja")}>
              {t("settings.languageJa")}
            </GameButton>
            <GameButton variant={language === "en" ? "primary" : "default"} size="sm" onClick={() => setLanguage("en")}>
              {t("settings.languageEn")}
            </GameButton>
          </div>
        </section>

        <section>
          <SectionHeader title={t("settings.numberFormat")} accent="cyan" />
          <div className="mt-2 flex gap-2">
            <GameButton
              variant={numberFormat === "short" ? "primary" : "default"}
              size="sm"
              onClick={() => setNumberFormat("short")}
            >
              {t("settings.numberFormatShort")}
            </GameButton>
            <GameButton
              variant={numberFormat === "full" ? "primary" : "default"}
              size="sm"
              onClick={() => setNumberFormat("full")}
            >
              {t("settings.numberFormatFull")}
            </GameButton>
          </div>
        </section>

        <section>
          <SectionHeader title={t("settings.animations")} accent="cyan" />
          <div className="mt-2 flex gap-2">
            <GameButton
              variant={animationsEnabled ? "primary" : "default"}
              size="sm"
              onClick={() => setAnimationsEnabled(true)}
            >
              {t("settings.on")}
            </GameButton>
            <GameButton
              variant={!animationsEnabled ? "primary" : "default"}
              size="sm"
              onClick={() => setAnimationsEnabled(false)}
            >
              {t("settings.off")}
            </GameButton>
          </div>
        </section>

        <section>
          <SectionHeader title={t("settings.autoSave")} accent="cyan" />
          <div className="mt-2 flex gap-2">
            <GameButton
              variant={autoSaveEnabled ? "primary" : "default"}
              size="sm"
              onClick={() => setAutoSaveEnabled(true)}
            >
              {t("settings.on")}
            </GameButton>
            <GameButton
              variant={!autoSaveEnabled ? "primary" : "default"}
              size="sm"
              onClick={() => setAutoSaveEnabled(false)}
            >
              {t("settings.off")}
            </GameButton>
          </div>
        </section>

        <section>
          <SectionHeader title={t("settings.audioMute")} accent="cyan" />
          <div className="mt-2 flex gap-2">
            <GameButton variant={!audio.muted ? "primary" : "default"} size="sm" onClick={() => updateAudio({ muted: false })}>
              {t("settings.on")}
            </GameButton>
            <GameButton variant={audio.muted ? "primary" : "default"} size="sm" onClick={() => updateAudio({ muted: true })}>
              {t("settings.off")}
            </GameButton>
          </div>
        </section>

        <section>
          <SectionHeader title={t("settings.bgmVolume")} accent="cyan" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.bgmVolume}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateAudio({ bgmVolume: Number(e.target.value) })}
            className="mt-2 w-full accent-cyan-400"
          />
        </section>

        <section>
          <SectionHeader title={t("settings.sfxVolume")} accent="cyan" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.sfxVolume}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateAudio({ sfxVolume: Number(e.target.value) })}
            className="mt-2 w-full accent-cyan-400"
          />
        </section>

        <section>
          <SectionHeader title={t("settings.cheatPanel")} accent="neutral" />
          <p className="mt-2 text-xs text-ink-muted">{t("settings.cheatPanelDevOnly")}</p>
        </section>

        <section>
          <SectionHeader title={t("settings.help")} accent="neutral" />
          <div className="mt-2 flex flex-wrap gap-2">
            <GameButton size="sm" onClick={() => openModal("tutorial")}>
              {t("settings.replayTutorial")}
            </GameButton>
            <GameButton size="sm" onClick={() => openModal("help")}>
              {t("help.title")}
            </GameButton>
            <GameButton size="sm" onClick={() => openModal("achievements")}>
              {t("achievements.title")}
            </GameButton>
          </div>
        </section>
      </div>
    </Modal>
  );
}
