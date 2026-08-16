import { useEffect, type MouseEvent, type ReactNode } from "react";
import { PixelFrame } from "./PixelFrame";

/**
 * Shared modal shell (Settings/Credits/SaveLoad/Tutorial all build on this).
 * Closes on Escape or the close button or a backdrop click, per the
 * accessibility requirements.
 */
export function Modal({
  title,
  onClose,
  children,
  widthClassName = "max-w-lg",
  closeLabel = "Close",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
  closeLabel?: string;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <PixelFrame
        as="section"
        className={`w-full ${widthClassName} max-h-[85vh] overflow-y-auto bg-panel-raised p-4 animate-flash-in`}
      >
        <div
          onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="mb-3 flex items-center justify-between border-b border-borderdim pb-2">
            <h2 className="font-display text-xs text-cyan-neon">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="border border-borderdim px-2 py-1 text-xs text-ink-dim transition hover:border-danger hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-neon"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </PixelFrame>
    </div>
  );
}
