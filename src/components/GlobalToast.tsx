import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../game/store/gameStore";
import { useT } from "../game/i18n";

type ToastKind = "modelComplete" | "lossExplosion" | "fundingSuccess" | "randomEventGood" | "randomEventBad";
/**
 * Phase 15 "Event System Expansion": `label` is a NEW optional field - when
 * set, the toast renders this text verbatim instead of the fixed
 * t(`notify.${kind}`) label every other toast kind uses. Used exclusively by
 * the new EventSystemState.eventSystem.recentEvents watcher below (each
 * fired event has its own distinct, ALREADY-localized title via
 * t(`events.items.${defId}.title`)), reusing the existing "randomEventGood"/
 * "randomEventBad" kinds purely for their good/bad color styling.
 */
type ToastEntry = { id: string; kind: ToastKind; label?: string };

const KIND_CLASSES: Record<ToastKind, string> = {
  modelComplete: "border-green-neon bg-green-dim/20 text-green-neon",
  lossExplosion: "border-danger bg-danger-dim/20 text-danger animate-pulse-glow",
  fundingSuccess: "border-cyan-neon bg-cyan-dim/20 text-cyan-neon",
  randomEventGood: "border-green-neon bg-green-dim/20 text-green-neon",
  randomEventBad: "border-warn bg-warn-dim/20 text-warn",
};

/**
 * Progression Expansion Sprint (spec section 6: random events need "Toast
 * notification"). engine/randomEvents.ts's messages are hardcoded Japanese
 * (same constraint as every other eventLog message, see this file's top doc
 * comment) but each one embeds its event's English flavor name verbatim
 * (e.g. "Research Grantを獲得しました"), so matching on that substring is
 * stable without needing a dedicated message-prefix convention.
 */
const GOOD_EVENT_MARKERS = ["Research Grant", "University Partnership", "Viral Growth", "VC Interest", "Open Source Breakthrough"];
const BAD_EVENT_MARKERS = ["GPU Failure", "Cooling Failure", "Data Leak", "Power Spike", "PR Incident"];

/**
 * Prominent transient notifications (Productization Sprint 2 section 10):
 * model-complete / Loss Explosion / funding-round-success get a more
 * noticeable toast than a plain event-log line, and a full-screen meltdown
 * treatment kicks in while isMeltdown is true. No new game logic - this
 * component only WATCHES existing GameState (eventLog entries, isMeltdown)
 * that engine/tick.ts and store/actions/*.ts already produce; it never
 * decides anything about the simulation itself.
 *
 * eventLog messages are hardcoded Japanese regardless of UI language (a
 * documented Sprint 1 scope limit - the engine layer can't depend on
 * settingsStore), so this component distinguishes toast KIND by matching
 * the stable Japanese prefix each single call site logs
 * (engine/tick.ts's "学習完了"/"Loss爆発", store/actions/raiseFunding.ts's
 * "資金調達を実行しました"), then renders an ALREADY-localized notify.* label
 * instead of the raw log message.
 */
export default function GlobalToast() {
  const t = useT();
  const eventLog = useGameStore((s) => s.eventLog);
  const isMeltdown = useGameStore((s) => s.isMeltdown);
  // Phase 15 "Event System Expansion".
  const recentGameEvents = useGameStore((s) => s.eventSystem.recentEvents);

  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const seenLength = useRef<number | null>(null);
  const seenGameEventsLength = useRef<number | null>(null);

  // Phase 15 "Event System Expansion": watches EventSystemState.eventSystem.
  // recentEvents growing (same "react to length only, first mount doesn't
  // replay history" shape as the eventLog watcher below) and shows one toast
  // per newly-fired event, using its own localized title
  // (t(`events.items.${defId}.title`)) as the label rather than a fixed
  // notify.* string - see ToastEntry's `label` field doc comment.
  useEffect(() => {
    if (seenGameEventsLength.current === null) {
      seenGameEventsLength.current = recentGameEvents.length;
      return;
    }
    if (recentGameEvents.length <= seenGameEventsLength.current) {
      seenGameEventsLength.current = recentGameEvents.length;
      return;
    }
    const newRecords = recentGameEvents.slice(seenGameEventsLength.current);
    seenGameEventsLength.current = recentGameEvents.length;

    const next: ToastEntry[] = newRecords.map((record) => ({
      id: record.id,
      kind: record.positive ? "randomEventGood" : "randomEventBad",
      label: t(`events.items.${record.defId}.title`),
    }));
    if (next.length === 0) return;

    setToasts((cur) => [...cur, ...next]);
    next.forEach((toast) => {
      window.setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== toast.id));
      }, 4000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentGameEvents]);

  useEffect(() => {
    if (seenLength.current === null) {
      // First mount (or a fresh load): don't replay history as new toasts.
      seenLength.current = eventLog.length;
      return;
    }
    if (eventLog.length <= seenLength.current) {
      seenLength.current = eventLog.length;
      return;
    }
    const newEntries = eventLog.slice(seenLength.current);
    seenLength.current = eventLog.length;

    const next: ToastEntry[] = [];
    for (const entry of newEntries) {
      if (entry.type === "success" && entry.message.startsWith("学習完了")) {
        next.push({ id: entry.id, kind: "modelComplete" });
      } else if (entry.type === "warning" && entry.message.includes("Loss爆発")) {
        next.push({ id: entry.id, kind: "lossExplosion" });
      } else if (entry.type === "success" && entry.message.startsWith("資金調達を実行しました")) {
        next.push({ id: entry.id, kind: "fundingSuccess" });
      } else if (GOOD_EVENT_MARKERS.some((marker) => entry.message.includes(marker))) {
        next.push({ id: entry.id, kind: "randomEventGood" });
      } else if (BAD_EVENT_MARKERS.some((marker) => entry.message.includes(marker))) {
        next.push({ id: entry.id, kind: "randomEventBad" });
      }
    }
    if (next.length === 0) return;

    setToasts((cur) => [...cur, ...next]);
    next.forEach((toast) => {
      window.setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== toast.id));
      }, 4000);
    });
    // eventLog is a new array reference every tick even when unchanged (see
    // engine/tick.ts), so this effect intentionally only reacts to length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventLog]);

  return (
    <>
      {isMeltdown && (
        <div className="pointer-events-none fixed inset-0 z-40 animate-pulse-glow border-8 border-danger" aria-hidden="true">
          <div className="absolute left-1/2 top-4 -translate-x-1/2 border border-danger bg-danger-dim/80 px-3 py-1.5 font-display text-[10px] text-ink-primary shadow-[0_0_20px_rgba(255,77,109,0.6)]">
            {t("notify.meltdownBanner")}
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`animate-flash-in pixel-frame border px-4 py-2 text-center font-display text-[10px] shadow-lg ${KIND_CLASSES[toast.kind]}`}
            >
              {toast.label ?? t(`notify.${toast.kind}`)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
