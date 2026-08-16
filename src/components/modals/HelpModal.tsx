import { useUiStore } from "../../app/uiStore";
import { useT } from "../../game/i18n";
import { Modal } from "../ui";

/**
 * In-game glossary (Feature Completion Sprint section 11): the 16 terms the
 * spec calls out by name. Purely presentational - every entry's copy lives
 * in i18n/{ja,en}.ts under help.items.<key>, no game logic here.
 */
const GLOSSARY_KEYS = [
  "rawData",
  "compute",
  "vram",
  "loss",
  "power",
  "cooling",
  "burnRate",
  "runway",
  "valuation",
  "equity",
  "enterpriseLicense",
  "agi",
  "learningRate",
  "lossExplosion",
  "thermalThrottling",
  "meltdown",
] as const;

export default function HelpModal() {
  const t = useT();
  const closeModal = useUiStore((s) => s.closeModal);

  return (
    <Modal title={t("help.title")} onClose={closeModal} closeLabel={t("common.close")} widthClassName="max-w-2xl">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {GLOSSARY_KEYS.map((key) => (
          <div key={key} className="border border-borderdim bg-panel-raised p-2">
            <div className="text-xs font-bold text-cyan-neon">{t(`help.items.${key}.term`)}</div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">{t(`help.items.${key}.desc`)}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
