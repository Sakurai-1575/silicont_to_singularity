import type { ReactNode } from "react";

/**
 * Base "retro terminal panel" shell: chunky double border + neon corner
 * accents (see .pixel-frame in src/index.css). Every boxed surface in the
 * game (GamePanel, Modal, StatCard groupings) should build on this rather
 * than inventing its own border treatment, so the whole app reads as one
 * visual system.
 */
export function PixelFrame({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "aside";
}) {
  return <Tag className={`pixel-frame bg-panel ${className}`}>{children}</Tag>;
}
