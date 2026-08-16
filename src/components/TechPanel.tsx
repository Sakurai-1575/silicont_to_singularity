import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";
import { useNumberFormat } from "../app/useFormat";
import { GamePanel, StatRow } from "./ui";
import TechTreeView from "./TechTreeView";

/**
 * Tech tree tab (spec section 11: "既存TechPanelの中身をRealTechTreeViewに置き換
 * える"). Phase 2 "Real Tech Tree UI" sprint: this file is now a thin wrapper
 * that keeps the existing GamePanel chrome (title + Research Points stat
 * row, unchanged from before this sprint) and delegates the actual tree
 * rendering to TechTreeView.tsx (node-graph canvas + detail panel). No
 * import path changed - GameScreen.tsx still does `<TechPanel />` exactly as
 * before, so this swap required zero changes outside this file plus the new
 * TechTreeView.tsx.
 */
export default function TechPanel() {
  const t = useT();
  const fmt = useNumberFormat();
  const researchPoints = useGameStore((s) => s.researchPoints);

  return (
    <GamePanel title={t("tech.title")} accent="cyan">
      <StatRow label={t("tech.researchPoints")} value={`${fmt.number(researchPoints)} RP`} />
      <div className="mt-3">
        <TechTreeView />
      </div>
    </GamePanel>
  );
}
