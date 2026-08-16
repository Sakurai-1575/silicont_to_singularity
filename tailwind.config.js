/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--color-bg-void)",
        panel: "var(--color-bg-panel)",
        "panel-raised": "var(--color-bg-panel-raised)",
        inset: "var(--color-bg-inset)",
        borderdim: "var(--color-border)",
        borderbright: "var(--color-border-bright)",
        cyan: {
          neon: "var(--neon-cyan)",
          dim: "var(--neon-cyan-dim)",
        },
        green: {
          neon: "var(--neon-green)",
          dim: "var(--neon-green-dim)",
        },
        orange: {
          neon: "var(--neon-orange)",
          dim: "var(--neon-orange-dim)",
        },
        aqua: {
          neon: "var(--neon-aqua)",
          dim: "var(--neon-aqua-dim)",
        },
        violet: {
          neon: "var(--neon-violet)",
          dim: "var(--neon-violet-dim)",
        },
        // Phase 9 "Research Expansion Foundation": 4 new tech-category
        // accent colors, same additive pattern as cyan/green/orange/aqua/
        // violet above (var(...) pointing at the new :root tokens in
        // src/index.css) - no existing color entry changed.
        yellow: {
          neon: "var(--neon-yellow)",
          dim: "var(--neon-yellow-dim)",
        },
        magenta: {
          neon: "var(--neon-magenta)",
          dim: "var(--neon-magenta-dim)",
        },
        amber2: {
          neon: "var(--neon-amber2)",
          dim: "var(--neon-amber2-dim)",
        },
        blue: {
          neon: "var(--neon-blue)",
          dim: "var(--neon-blue-dim)",
        },
        danger: {
          DEFAULT: "var(--danger-red)",
          dim: "var(--danger-red-dim)",
        },
        warn: {
          DEFAULT: "var(--warn-amber)",
          dim: "var(--warn-amber-dim)",
        },
        ink: {
          primary: "var(--text-primary)",
          dim: "var(--text-dim)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        panel: "var(--radius-panel)",
      },
    },
  },
  plugins: [],
};
