import ResourcePanel from "./ResourcePanel";
import HardwarePanel from "./HardwarePanel";
import StaffPanel from "./StaffPanel";
import TechPanel from "./TechPanel";
import TrainingPanel from "./TrainingPanel";
import MarketPanel from "./MarketPanel";
import WarningPanel from "./WarningPanel";
import EventLogPanel from "./EventLogPanel";
import DebugPanel from "./DebugPanel";
import CheatPanel from "./CheatPanel";
import { useGameStore } from "../game/store/gameStore";

export default function Dashboard() {
  const isGameCleared = useGameStore((s) => s.isGameCleared);

  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-4">
        <h1 className="text-lg font-bold text-slate-100">Silicon to Singularity - Debug Dashboard</h1>
        <p className="text-xs text-slate-500">Phase MVP core engine (see requirements doc for full scope)</p>
      </header>

      {isGameCleared && (
        <div className="mb-4 rounded border border-emerald-700 bg-emerald-950 p-3 text-emerald-300">
          🎉 Singularity Achieved - AGI-Omni 100T training complete. (Full clear-screen presentation is a later phase.)
        </div>
      )}

      <WarningPanel />

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResourcePanel />
        <HardwarePanel />
        <TrainingPanel />
        <MarketPanel />
        <StaffPanel />
        <TechPanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EventLogPanel />
        <DebugPanel />
      </div>

      <div className="mt-4">
        <CheatPanel />
      </div>
    </div>
  );
}
