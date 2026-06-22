import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, locales, LOCALE_COOKIE, type Locale } from "./config";

/** Best-match the `Accept-Language` header against our supported locales. */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const wanted = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .map((tag) => tag.split("-")[0]);
  for (const base of wanted) {
    const hit = locales.find((l) => l === base);
    if (hit) return hit;
  }
  return null;
}

/**
 * Resolves the active locale for every request: an explicit cookie wins
 * (set by the language switcher), otherwise we auto-detect from the browser's
 * `Accept-Language` header, falling back to Italian.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale)
    ? cookieLocale
    : (fromAcceptLanguage((await headers()).get("accept-language")) ?? defaultLocale);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
