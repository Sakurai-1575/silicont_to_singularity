/**
 * Inline SVG icon placeholders (UI Professional Polish Sprint section 11).
 * No external image assets or URLs - every glyph is hand-drawn geometry
 * using `currentColor`, so it inherits whatever text color class the caller
 * applies (matching the existing neon palette automatically) and never has
 * a broken-image failure mode. Kept intentionally simple/geometric (chips,
 * fans, racks) rather than detailed illustration - these are placeholders
 * the user can later swap for real art without changing any call site,
 * since every icon takes the same `className` prop.
 */
export type IconKind =
  | "gpu"
  | "cooling"
  | "facility"
  | "model"
  | "tech"
  | "staffDataEngineer"
  | "staffInfraOps"
  | "staffResearcher"
  | "staffBusiness"
  | "finance"
  | "agi"
  | "achievement"
  | "objective"
  | "unknown";

function GpuGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="9" width="5" height="5" fill="currentColor" opacity="0.35" />
      <line x1="13" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="1.2" />
      <line x1="13" y1="11.5" x2="18" y2="11.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="13" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="9" x2="3" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="1.5" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="1.5" y1="15" x2="3" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="21" y1="9" x2="22.5" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="21" y1="15" x2="22.5" y2="15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CoolingGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M12 12C12 8 10 5 12 3C14 5 13.5 8.5 12 12Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M12 12C15.5 11 18.5 9.5 21 11C19.5 13 16 13.5 12 12Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M12 12C8.5 13 5.5 14.5 3 13C4.5 11 8 10.5 12 12Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

function FacilityGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 21V9L12 3L20 9V21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="7" y="12" width="3" height="3" fill="currentColor" opacity="0.4" />
      <rect x="14" y="12" width="3" height="3" fill="currentColor" opacity="0.4" />
      <rect x="10" y="16" width="4" height="5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ModelGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="6" r="1.8" fill="currentColor" />
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="5" cy="18" r="1.8" fill="currentColor" />
      <circle cx="12" cy="9" r="1.8" fill="currentColor" />
      <circle cx="12" cy="15" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="2.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1" opacity="0.55">
        <line x1="6.5" y1="6.5" x2="10.5" y2="8.7" />
        <line x1="6.5" y1="11.5" x2="10.5" y2="9.5" />
        <line x1="6.5" y1="12.5" x2="10.5" y2="14.5" />
        <line x1="6.5" y1="17.5" x2="10.5" y2="15.5" />
        <line x1="13.5" y1="9.3" x2="17" y2="11.3" />
        <line x1="13.5" y1="14.7" x2="17" y2="12.7" />
      </g>
    </svg>
  );
}

function TechGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14 8L20 8L15 12L17 18L12 14.5L7 18L9 12L4 8L10 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function StaffGlyph({ variant }: { variant: "dataEngineer" | "infraOps" | "researcher" | "business" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="16" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 17.5C7.5 15 9.5 13.8 12 13.8C14.5 13.8 16.5 15 17.5 17.5" stroke="currentColor" strokeWidth="1.3" />
      {variant === "dataEngineer" && <rect x="8.5" y="18.6" width="7" height="1.4" fill="currentColor" opacity="0.5" />}
      {variant === "infraOps" && (
        <>
          <line x1="6" y1="19.5" x2="18" y2="19.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        </>
      )}
      {variant === "researcher" && <circle cx="12" cy="19" r="0.9" fill="currentColor" opacity="0.6" />}
      {/* Progression Expansion Sprint: Business/Executive tier fallback - a small briefcase badge distinguishes it from the other 3 roles' icons. */}
      {variant === "business" && <rect x="9.5" y="18.4" width="5" height="2" rx="0.4" stroke="currentColor" strokeWidth="1" opacity="0.7" />}
    </svg>
  );
}

function FinanceGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 20H21" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5" y="13" width="3" height="7" fill="currentColor" opacity="0.35" />
      <rect x="10.5" y="9" width="3" height="11" fill="currentColor" opacity="0.5" />
      <rect x="16" y="5" width="3" height="15" fill="currentColor" opacity="0.65" />
      <path d="M4 10L9 6L13.5 8.5L20 3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/** CelebrationBanner (Steam-quality UI/UX review sprint, section 3.9/5) + AchievementWatcher's toast use this for the trophy/star-burst glyph. */
function AchievementGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.2 8.2L20.8 8.4L15.6 12.4L17.5 18.8L12 15L6.5 18.8L8.4 12.4L3.2 8.4L9.8 8.2Z" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="11" r="10" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

/** CelebrationBanner's Objective-complete glyph - a simple checked flag. */
function ObjectiveGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="3" x2="5" y2="21" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 4H18L15 8L18 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
      <path d="M9.5 7L10.8 8.5L13.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Discovery System (Steam-quality UI/UX review sprint, section 3.2): the
 * "hidden/undiscovered" silhouette glyph shown on EquipmentCard/ModelCard/
 * TechPanel nodes before their gating research is even on the horizon - a
 * generic question-mark-in-a-box so nothing about the real item leaks.
 */
function UnknownGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2.5" opacity="0.7" />
      <path
        d="M9.5 9.2C9.5 7.7 10.6 6.6 12 6.6C13.4 6.6 14.5 7.6 14.5 8.9C14.5 10.6 12.3 10.6 12.2 12.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12.1" cy="15.6" r="1.05" fill="currentColor" />
    </svg>
  );
}

function AgiGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="12" cy="3" r="1.4" fill="currentColor" />
      <circle cx="21" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="21" r="1.4" fill="currentColor" />
      <circle cx="3" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18.4" cy="5.6" r="1.1" fill="currentColor" opacity="0.7" />
      <circle cx="18.4" cy="18.4" r="1.1" fill="currentColor" opacity="0.7" />
      <circle cx="5.6" cy="18.4" r="1.1" fill="currentColor" opacity="0.7" />
      <circle cx="5.6" cy="5.6" r="1.1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function Icon({ kind, className = "h-6 w-6" }: { kind: IconKind; className?: string }) {
  return (
    <div className={className}>
      {kind === "gpu" && <GpuGlyph />}
      {kind === "cooling" && <CoolingGlyph />}
      {kind === "facility" && <FacilityGlyph />}
      {kind === "model" && <ModelGlyph />}
      {kind === "tech" && <TechGlyph />}
      {kind === "staffDataEngineer" && <StaffGlyph variant="dataEngineer" />}
      {kind === "staffInfraOps" && <StaffGlyph variant="infraOps" />}
      {kind === "staffResearcher" && <StaffGlyph variant="researcher" />}
      {kind === "staffBusiness" && <StaffGlyph variant="business" />}
      {kind === "finance" && <FinanceGlyph />}
      {kind === "agi" && <AgiGlyph />}
      {kind === "achievement" && <AchievementGlyph />}
      {kind === "objective" && <ObjectiveGlyph />}
      {kind === "unknown" && <UnknownGlyph />}
    </div>
  );
}
