import { playSound } from "../../game/services/audio";

export type TabDef<T extends string> = {
  id: T;
  label: string;
  /** Optional short glyph shown before the label (Sprint 2 HUD polish) - text/emoji only, no image assets. */
  icon?: string;
  /** Short description shown in a hover tooltip (UI Professional Polish Sprint section 6). */
  description?: string;
};

/**
 * Bottom dock-style game navigation (UI Professional Polish Sprint section
 * 6), replacing Sprint 2's underline web-app tab row. Fixed to the bottom of
 * the viewport via .dock-nav so it reads as a game HUD element rather than
 * browser-tab chrome; the active tab gets a strong inset glow (.dock-tab-active)
 * and each button shows a short description tooltip on hover. Selection
 * logic is unchanged - still a plain onChange(id) callback into useUiStore.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav role="tablist" className="dock-nav fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <div className="flex w-full max-w-[1600px] items-stretch justify-center gap-1 overflow-x-auto px-2 py-1.5 sm:gap-1.5 sm:px-3">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                if (tab.id !== active) playSound("tabSwitch");
                onChange(tab.id);
              }}
              className={`dock-tab group relative flex min-w-[54px] flex-1 flex-col items-center gap-0.5 px-1.5 py-1.5 font-display text-[9px] uppercase tracking-wide sm:min-w-[72px] sm:text-[10px] ${
                isActive ? "dock-tab-active text-cyan-neon" : "text-ink-dim"
              }`}
            >
              {tab.icon && <span className="text-base leading-none sm:text-lg">{tab.icon}</span>}
              <span className="truncate">{tab.label}</span>
              {tab.description && <span className="dock-tooltip">{tab.description}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
