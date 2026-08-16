import type { ReactNode } from "react";
import { PixelFrame } from "./PixelFrame";
import { SectionHeader, type Accent } from "./SectionHeader";

/**
 * The standard boxed panel used throughout the game screens (resources,
 * hardware, training, market, staff, tech, log...). Presentation only - it
 * never touches game state itself.
 */
export function GamePanel({
  title,
  accent = "neutral",
  headerRight,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  accent?: Accent;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <PixelFrame className={`p-3 ${className}`}>
      <SectionHeader title={title} accent={accent} right={headerRight} />
      <div className={`mt-2 ${bodyClassName}`}>{children}</div>
    </PixelFrame>
  );
}
