import { useUiStore } from "../../app/uiStore";
import SettingsModal from "./SettingsModal";
import CreditsModal from "./CreditsModal";
import SaveLoadModal from "./SaveLoadModal";
import TutorialModal from "./TutorialModal";
import HelpModal from "./HelpModal";
import AchievementsModal from "./AchievementsModal";

/**
 * Renders whichever modal (if any) is active, regardless of which screen
 * (Title/Game) is showing underneath - mounted once near the app root (see
 * app/App.tsx) so Title and Game don't each need their own modal wiring.
 */
export default function ModalRoot() {
  const activeModal = useUiStore((s) => s.activeModal);

  switch (activeModal) {
    case "settings":
      return <SettingsModal />;
    case "credits":
      return <CreditsModal />;
    case "saveload":
      return <SaveLoadModal />;
    case "tutorial":
      return <TutorialModal />;
    case "help":
      return <HelpModal />;
    case "achievements":
      return <AchievementsModal />;
    default:
      return null;
  }
}
