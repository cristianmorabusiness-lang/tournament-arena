/** Supported UI languages. `it` is the default / fallback. */
export const locales = ["it", "en", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "it";

/** Native names shown in the language switcher. */
export const localeNames: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
};

/** Long-lived cookie that pins the visitor's chosen language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Maps a BCP-47 locale (e.g. "it-IT") to the formatting locale tag we use. */
export const formatLocale: Record<Locale, string> = {
  it: "it-IT",
  en: "en-GB",
  es: "es-ES",
};
