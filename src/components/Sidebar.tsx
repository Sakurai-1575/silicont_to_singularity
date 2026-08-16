import { useUiStore, type GameTab, NAV_GROUP_TABS, TAB_TO_GROUP, NAVIGATION_GROUP_ORDER, TAB_ICON, GROUP_ICON } from "../app/uiStore";
import { useT } from "../game/i18n";
import { playSound } from "../game/services/audio";

/**
 * Phase 11 "App Shell Restructure": the new navigation skeleton. Same
 * underlying data (app/uiStore.ts's GameTab) and the same onSelectTab
 * callback (useUiStore.setGameTab) as the pre-existing bottom dock
 * (ui/Tabs.tsx, still used unmodified for narrow viewports) - this
 * component only adds a second way to reach the same 9 tabs, grouped into
 * the 6 categories from the Phase 10 UI/UX audit. No panel content, no
 * game logic here.
 *
 * "vertical": the wide-viewport left rail (hidden below the `lg`
 * breakpoint, shown via GameScreen.tsx). Each of the 6 categories is a
 * clickable header (jumps to its first tab) with a hover tooltip; groups
 * that contain more than one tab additionally list their tabs as small
 * sub-buttons underneath, so every existing screen stays a single click
 * away without needing to guess which category it lives under.
 *
 * "horizontal": a compact fallback strip for narrow viewports (hidden at
 * `lg` and above) rendered above the persistent ObjectivePanel. The
 * pre-existing bottom dock already reaches all 8 original tabs on narrow
 * screens, so this strip's only real job is making the new "command" tab
 * reachable there too - it reuses the same category list for consistency
 * rather than inventing a narrow-screen-only navigation model.
 */
export default function Sidebar({ variant }: { variant: "vertical" | "horizontal" }) {
  const t = useT();
  const activeTab = useUiStore((s) => s.gameTab);
  const setGameTab = useUiStore((s) => s.setGameTab);
  const activeGroup = TAB_TO_GROUP[activeTab];

  const selectTab = (tab: GameTab) => {
    if (tab !== activeTab) playSound("tabSwitch");
    setGameTab(tab);
  };

  if (variant === "horizontal") {
    return (
      <nav
        aria-label={t("sidebar.navLabel")}
        className="dock-nav mb-3 flex gap-1 overflow-x-auto border-b border-borderbright px-2 py-1.5 lg:hidden"
      >
        {NAVIGATION_GROUP_ORDER.map((group) => {
          const isActive = group === activeGroup;
          return (
            <button
              key={group}
              type="button"
              onClick={() => selectTab(NAV_GROUP_TABS[group][0])}
              className={`dock-tab flex min-w-[52px] flex-1 flex-col items-center gap-0.5 px-1.5 py-1.5 font-display text-[9px] uppercase tracking-wide ${
                isActive ? "dock-tab-active text-cyan-neon" : "text-ink-dim"
              }`}
            >
              <span className="text-base leading-none">{GROUP_ICON[group]}</span>
              <span className="truncate">{t(`sidebar.groups.${group}`)}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <aside
      aria-label={t("sidebar.navLabel")}
      className="sidebar-nav hidden w-44 shrink-0 flex-col gap-1 self-start py-2 lg:flex"
    >
      {NAVIGATION_GROUP_ORDER.map((group) => {
        const groupTabs = NAV_GROUP_TABS[group];
        const isGroupActive = group === activeGroup;
        return (
          <div key={group} className="flex flex-col">
            <button
              type="button"
              onClick={() => selectTab(groupTabs[0])}
              className={`sidebar-group flex items-center gap-2 px-3 py-2 text-left font-display text-[10px] uppercase tracking-wide ${
                isGroupActive ? "sidebar-group-active text-cyan-neon" : "text-ink-dim"
              }`}
            >
              <span className="text-sm leading-none">{GROUP_ICON[group]}</span>
              <span className="truncate">{t(`sidebar.groups.${group}`)}</span>
              <span className="sidebar-tooltip">{t(`sidebar.groupsDesc.${group}`)}</span>
            </button>

            {groupTabs.length > 1 && (
              <div className="ml-6 flex flex-col gap-0.5 pb-1">
                {groupTabs.map((tab) => {
                  const isTabActive = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => selectTab(tab)}
                      className={`flex items-center gap-1.5 px-2 py-1 text-left text-[10px] transition ${
                        isTabActive ? "sidebar-subtab-active text-cyan-neon" : "text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      <span className="leading-none">{TAB_ICON[tab]}</span>
                      <span className="truncate">{t(`nav.${tab}`)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
