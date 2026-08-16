import { useState } from "react";
import { useSettingsStore } from "../../app/settingsStore";
import { useUiStore } from "../../app/uiStore";
import { useT } from "../../game/i18n";
import { Modal, GameButton } from "../ui";

type StepKey =
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "step7"
  | "step8"
  | "step9"
  | "step10";
const STEPS: StepKey[] = ["step1", "step2", "step3", "step4", "step5", "step6", "step7", "step8", "step9", "step10"];

/**
 * First-run skippable tutorial, expanded from 3 to 10 steps in the Early
 * Game Milestone & Balance Sprint (spec section 8) so it walks through the
 * exact same order as the Objective Panel's early progression (engine/
 * objectives.ts's Phase A -> Phase D milestones: click raw data, refine
 * data, buy GPU, buy cooling, train TinyNet, deploy TinyNet, check first
 * revenue, hire Data Engineer, hire AI Researcher, unlock Tech). Triggered
 * from TitleScreen.startFresh() the first time a New Game is started with
 * settings.hasSeenTutorial === false, and replayable any time from Settings
 * (settings.replayTutorial). Any way of dismissing it (Skip, Start, or the
 * modal's own X/Esc) marks it seen and proceeds to the game screen, so the
 * player is never stuck unable to reach the game; the Objective Panel keeps
 * giving the player a "next thing to do" long after these 10 steps end.
 */
export default function TutorialModal() {
  const t = useT();
  const markTutorialSeen = useSettingsStore((s) => s.markTutorialSeen);
  const closeModal = useUiStore((s) => s.closeModal);
  const goToGame = useUiStore((s) => s.goToGame);

  const [stepIndex, setStepIndex] = useState(0);
  const stepKey = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const finish = () => {
    markTutorialSeen();
    closeModal();
    goToGame();
  };

  return (
    <Modal title={t("tutorial.title")} onClose={finish} closeLabel={t("common.close")}>
      <div className="flex min-h-[9rem] flex-col justify-between gap-4">
        <div>
          <h3 className="font-display text-[11px] text-cyan-neon">{t(`tutorial.${stepKey}Title`)}</h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-primary">{t(`tutorial.${stepKey}Body`)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 ${i === stepIndex ? "bg-cyan-neon" : "bg-borderdim"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <GameButton variant="ghost" size="sm" onClick={finish}>
              {t("tutorial.skip")}
            </GameButton>
            {isLastStep ? (
              <GameButton variant="primary" size="sm" onClick={finish}>
                {t("tutorial.start")}
              </GameButton>
            ) : (
              <GameButton variant="default" size="sm" onClick={() => setStepIndex((i) => i + 1)}>
                {t("tutorial.next")}
              </GameButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
