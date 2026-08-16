import { create } from "zustand";

/**
 * Pure UI navigation state (which screen/modal is showing). Deliberately
 * separate from useGameStore (game data) and useSettingsStore (preferences)
 * - this store holds nothing that needs to persist across a reload.
 */
export type Screen = "title" | "game";
export type ModalType = "settings" | "credits" | "saveload" | "tutorial" | "help" | "achievements" | null;

/**
 * The in-game facility tabs (Productization Sprint 2). The original 8
 * values match ObjectiveTargetTab in src/game/types/objectives.ts by
 * convention (not by import - that file stays free of any app/ dependency)
 * so ObjectivePanel can call setGameTab(objective.targetTab) directly to
 * jump the player to the right tab. "command" was added additively in
 * Phase 11 "App Shell Restructure" for the new Command Center placeholder
 * screen (spec section 3) - it is NOT part of ObjectiveTargetTab (no
 * Objective ever targets it), so every existing setGameTab(objective.
 * targetTab) call keeps working unchanged: ObjectiveTargetTab's 8-value
 * union is simply a subset of this now-9-value union.
 */
export type GameTab = "command" | "base" | "datacenter" | "lab" | "market" | "org" | "tech" | "finance" | "log";

/**
 * Phase 11 "App Shell Restructure" (spec section 4): a purely presentational
 * grouping layer on top of the existing GameTab, introduced instead of
 * replacing GameTab so every existing tab-keyed lookup (TAB_ICON, the i18n
 * nav and navDesc keys, ObjectivePanel's targetTab navigation) keeps working
 * untouched. NavigationGroup only exists to drive the new left
 * sidebar/top group-strip (see components/Sidebar.tsx): which of the 6
 * top-level categories is "active" is always DERIVED from the current
 * gameTab via TAB_TO_GROUP below, never stored separately - so there is no
 * second piece of state that could ever fall out of sync with gameTab, and
 * nothing here is persisted (same as the rest of this store).
 */
export type NavigationGroup = "command" | "operations" | "ailab" | "market" | "company" | "reports";

/** Which GameTabs live under each sidebar category, in the order they should be listed. */
export const NAV_GROUP_TABS: Record<NavigationGroup, GameTab[]> = {
  command: ["command"],
  operations: ["base", "datacenter"],
  ailab: ["lab", "tech"],
  market: ["market"],
  company: ["org", "finance"],
  reports: ["log"],
};

/** Reverse lookup of NAV_GROUP_TABS, used to highlight the active sidebar category for whatever tab is currently showing. */
export const TAB_TO_GROUP: Record<GameTab, NavigationGroup> = {
  command: "command",
  base: "operations",
  datacenter: "operations",
  lab: "ailab",
  tech: "ailab",
  market: "market",
  org: "company",
  finance: "company",
  log: "reports",
};

/** Display order of the 6 sidebar/group-strip categories (spec section 2). */
export const NAVIGATION_GROUP_ORDER: NavigationGroup[] = ["command", "operations", "ailab", "market", "company", "reports"];

/**
 * Short glyph shown before each tab's label. Moved here from
 * components/screens/GameScreen.tsx in Phase 11 so both the bottom dock
 * (ui/Tabs.tsx, via GameScreen) and the new left sidebar / group-strip
 * (components/Sidebar.tsx) render the exact same icon for a given tab
 * instead of maintaining two copies that could drift apart.
 */
export const TAB_ICON: Record<GameTab, string> = {
  command: "◆",
  base: "⌂",
  datacenter: "▦",
  lab: "⚗",
  market: "↑",
  org: "☺",
  tech: "⬡",
  finance: "◎",
  log: "≡",
};

/** Short glyph shown before each sidebar category's label (components/Sidebar.tsx). */
export const GROUP_ICON: Record<NavigationGroup, string> = {
  command: "◆",
  operations: "▦",
  ailab: "⚗",
  market: "↑",
  company: "☺",
  reports: "≡",
};

type UiStore = {
  screen: Screen;
  activeModal: ModalType;
  gameTab: GameTab;
  /**
   * Game Clear / Bankruptcy overlays (Feature Completion Sprint sections 3/4)
   * are deliberately NOT part of ModalType/activeModal - they're full-screen
   * takeovers that must be able to coexist with (be shown on top of) the
   * regular game screen regardless of whatever modal state was active, and
   * "already shown once, dismissed, still reachable again" is a different
   * lifecycle than the single-active-modal ModalRoot pattern. See
   * components/EndStateWatcher.tsx for what flips these true automatically.
   */
  showClearScreen: boolean;
  showBankruptcyScreen: boolean;
  goToTitle: () => void;
  goToGame: () => void;
  openModal: (modal: Exclude<ModalType, null>) => void;
  closeModal: () => void;
  setGameTab: (tab: GameTab) => void;
  openClearScreen: () => void;
  closeClearScreen: () => void;
  openBankruptcyScreen: () => void;
  closeBankruptcyScreen: () => void;
};

export const useUiStore = create<UiStore>()((set) => ({
  screen: "title",
  activeModal: null,
  gameTab: "base",
  showClearScreen: false,
  showBankruptcyScreen: false,
  goToTitle: () => set({ screen: "title", activeModal: null, showClearScreen: false, showBankruptcyScreen: false }),
  goToGame: () => set({ screen: "game", activeModal: null, gameTab: "base" }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setGameTab: (tab) => set({ gameTab: tab }),
  openClearScreen: () => set({ showClearScreen: true }),
  closeClearScreen: () => set({ showClearScreen: false }),
  openBankruptcyScreen: () => set({ showBankruptcyScreen: true }),
  closeBankruptcyScreen: () => set({ showBankruptcyScreen: false }),
}));
