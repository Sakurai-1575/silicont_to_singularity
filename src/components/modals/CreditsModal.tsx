import { useUiStore } from "../../app/uiStore";
import { useT } from "../../game/i18n";
import { Modal } from "../ui";

export default function CreditsModal() {
  const t = useT();
  const closeModal = useUiStore((s) => s.closeModal);

  return (
    <Modal title={t("credits.title")} onClose={closeModal} closeLabel={t("common.close")}>
      <p className="whitespace-pre-line font-body text-xs leading-relaxed text-ink-primary">{t("credits.body")}</p>
    </Modal>
  );
}
