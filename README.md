# Silicon to Singularity

A semiconductor/AI-infrastructure management sim. The core simulation (MVP,
Phase 1-3) is a pure Tick Engine + Zustand store (slice-composed) covering
finance, hardware/thermal, data collection, staff, tech tree, AI training
(loss, Loss Explosion, completion), deployment, API/subscription revenue,
valuation, funding rounds, bankruptcy, warnings, and the event log.

Productization Sprint 1 adds a full Title/Settings/Credits/Save-Load UI, a
3-slot save system, full Japanese localization (with an English dictionary
scaffold for the future), a pixel/retro-terminal design system, an
auto-derived Objective Panel, and a restyled in-game screen (Header +
概要/人材・技術/ログ tabs). See the assistant's Sprint 1 delivery report for
the full breakdown of what changed and what's still stubbed.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

## Other commands

```bash
npm run build     # tsc type-check (via `tsc -b`) + production build to dist/
npm run preview   # serve the production build locally
npm run lint       # tsc --noEmit only (fast type-check without building)
```

## Notes

- This project was authored without a working `npm install` in the authoring
  environment (network access to the npm registry was blocked there). All
  cross-file imports/exports were verified with a local ad-hoc `tsc` pass
  against hand-written type shims for `react`/`zustand` instead of the real
  packages - see the delivery notes from the assistant for what that did and
  didn't catch. Please report anything `npm install && npm run dev` surfaces
  that wasn't already flagged.
- The Dev Tools panel (`src/components/CheatPanel.tsx`, includes the old
  debug state dump) is automatically excluded from production builds via
  Vite's `import.meta.env.DEV` flag.
- Out of scope for this pass (stubbed or omitted, see code comments):
  Enterprise License delivery action, the full AGI "Singularity" clear-screen
  presentation (the underlying clear-condition detection runs, but without
  enforcing the "no Loss Explosion occurred" condition, and without a
  dedicated full-screen clear presentation - just a banner), multi-model
  simultaneous deployment, tech tree visualization, charts, offline progress,
  Tauri/Electron packaging, achievements, and real sound (a silent
  `src/game/services/audio.ts` stub exists for future hookup).
- `src/components/Dashboard.tsx` (the Sprint 0 debug dashboard) has been
  superseded by `src/components/screens/GameScreen.tsx` and removed from
  this delivery. If your project folder still has the old file from Sprint 0,
  it's safe to delete - nothing imports it anymore.
