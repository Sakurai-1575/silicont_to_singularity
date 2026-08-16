import ja from "./ja";
import en from "./en";
// Deliberate cross-layer import: i18n is a presentation concern even though
// it lives under game/ per the requested file layout, so it's the one
// place in game/ allowed to depend on an app/ store (never the reverse -
// engine/data/types never import from app/ or i18n/).
import { useSettingsStore } from "../../app/settingsStore";

export type Language = "ja" | "en";
/** ja.ts is the source of truth for every valid i18n key's shape. */
export type Messages = typeof ja;

const DICTIONARIES: Record<Language, Messages> = { ja, en };

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Resolve `key` (dot-path, e.g. "resource.cash") in the given language,
 * falling back to Japanese and finally to the raw key itself if missing -
 * a typo'd or not-yet-translated key degrades to visible-but-harmless
 * placeholder text instead of crashing the app.
 */
export function translate(lang: Language, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.ja;
  let value = getByPath(dict, key);
  if (typeof value !== "string") {
    value = getByPath(DICTIONARIES.ja, key);
  }
  if (typeof value !== "string") {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing key: "${key}"`);
    }
    return key;
  }
  if (!vars) return value;
  return Object.entries(vars).reduce((str, [k, v]) => str.split(`{{${k}}}`).join(String(v)), value);
}

/** React hook: returns a `t(key, vars?)` function bound to the current language setting. */
export function useT() {
  const language = useSettingsStore((s) => s.language);
  return (key: string, vars?: Record<string, string | number>) => translate(language, key, vars);
}
