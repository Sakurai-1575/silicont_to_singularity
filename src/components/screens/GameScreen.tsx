import { useEffect } from "react";
import { useGameStore } from "../../game/store/gameStore";
import { useUiStore, type GameTab, TAB_ICON } from "../../app/uiStore";
import { useT } from "../../game/i18n";
import { getVisualStage } from "../../game/engine/progression";
import { playBgm } from "../../game/services/audio";
import { Tabs, type TabDef } from "../ui";
import GameHeader from "../GameHeader";
import Sidebar from "../Sidebar";
import ObjectivePanel from "../ObjectivePanel";
import CommandCenterPanel from "../CommandCenterPanel";
import BaseView from "../BaseView";
import HardwarePanel from "../HardwarePanel";
import TrainingPanel from "../TrainingPanel";
import MarketPanel from "../MarketPanel";
import StaffPanel from "../StaffPanel";
import TechPanel from "../TechPanel";
import FinancePanel from "../FinancePanel";
import ReportsPanel from "../ReportsPanel";

/**
 * In-game screen. Sticky header, a persistent compact Objective strip that
 * stays visible across every tab switch, and now (Phase 11 "App Shell
 * Restructure") a two-tier navigation layer instead of a single bottom
 * dock:
 *  - Wide viewports (`lg:` and up): a left <Sidebar variant="vertical">
 *    rail grouping the 9 tabs into the 6 Phase 10 categories, and the
 *    bottom dock is hidden entirely.
 *  - Narrow viewports: the ORIGINAL bottom dock (<Tabs>, unmodified, still
 *    the 8 original facility tabs) stays exactly as it was, plus a slim
 *    <Sidebar variant="horizontal"> group-strip above the Objective panel
 *    so the new Command Center placeholder is reachable there too.
 * Tab selection still lives entirely in useUiStore (gameTab), unchanged -
 * both the sidebar and the dock are just two different ways to call the
 * same setGameTab. No panel here contains game-formula logic - each tab
 * just arranges the existing domain panels.
 */
export default function GameScreen() {
  const t = useT();
  const isGameCleared = useGameStore((s) => s.isGameCleared);
  const visualStage = useGameStore((s) => getVisualStage(s));
  const tab = useUiStore((s) => s.gameTab);
  const setTab = useUiStore((s) => s.setGameTab);

  // BGM cross-fade by Base View stage (Feature Completion Sprint section 16),
  // driven from here (not BaseView.tsx) so it keeps playing/switching even
  // while the player is on a different tab. playBgm() is a no-op if that
  // stage's track is already playing, so this can safely re-run every render.
  useEffect(() => {
    playBgm(visualStage);
  }, [visualStage]);

  // Unchanged from before Phase 11: the original 8 facility tabs, still
  // fed as-is to the untouched <Tabs> bottom dock component. "command" is
  // deliberately NOT added here - it's reached via the new Sidebar instead,
  // so the bottom dock's behavior for existing players stays identical.
  const tabs: TabDef<GameTab>[] = [
    { id: "base", label: t("nav.base"), icon: TAB_ICON.base, description: t("navDesc.base") },
    { id: "datacenter", label: t("nav.datacenter"), icon: TAB_ICON.datacenter, description: t("navDesc.datacenter") },
    { id: "lab", label: t("nav.lab"), icon: TAB_ICON.lab, description: t("navDesc.lab") },
    { id: "market", label: t("nav.market"), icon: TAB_ICON.market, description: t("navDesc.market") },
    { id: "org", label: t("nav.org"), icon: TAB_ICON.org, description: t("navDesc.org") },
    { id: "tech", label: t("nav.tech"), icon: TAB_ICON.tech, description: t("navDesc.tech") },
    { id: "finance", label: t("nav.finance"), icon: TAB_ICON.finance, description: t("navDesc.finance") },
    { id: "log", label: t("nav.log"), icon: TAB_ICON.log, description: t("navDesc.log") },
  ];

  return (
    <div className="min-h-screen bg-void">
      <GameHeader />

      {/* pb-20/pb-24: keeps content clear of the fixed bottom dock on narrow
          viewports; the dock is hidden at lg: and up, so far less bottom
          padding is needed there. */}
      <div className="mx-auto flex max-w-[1600px] items-start gap-3 p-3 pb-24 sm:pb-20 lg:pb-4">
        <Sidebar variant="vertical" />

        <main className="min-w-0 flex-1">
          {isGameCleared && (
            <div className="mb-3 animate-pulse-glow border border-green-neon bg-green-dim/20 p-3 text-center text-sm font-semibold text-green-neon">
              {t("clear.banner")}
            </div>
          )}

          {/* Narrow-viewport fallback for the Sidebar above (spec section 5:
              "既存Tabs.tsxを下部ドックとして再利用...左サイドバーは非表示"). This is
              additional to the bottom dock, not a replacement for it - the
              dock still handles the original 8 tabs on narrow screens. */}
          <Sidebar variant="horizontal" />

          {/* Persistent Objective strip - rendered outside the tab switch below
              so it never disappears when the player changes tabs (spec section 7). */}
          <div className="mb-3">
            <ObjectivePanel />
          </div>

          <div className="flex flex-col gap-3">
            {tab === "command" && <CommandCenterPanel />}

            {tab === "base" && <BaseView />}

            {tab === "datacenter" && <HardwarePanel />}

            {tab === "lab" && <TrainingPanel />}

            {tab === "market" && <MarketPanel />}

            {tab === "org" && <StaffPanel />}

            {tab === "tech" && <TechPanel />}

            {tab === "finance" && <FinancePanel />}

            {tab === "log" && <ReportsPanel />}
          </div>
        </main>
      </div>

      {/* Hidden at lg: and up - the left Sidebar takes over navigation there. */}
      <div className="lg:hidden">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
