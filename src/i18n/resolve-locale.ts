import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./constants";

export function isLocale(value: string | null | undefined): value is Locale {
  if (!value) {
    return false;
  }

  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().trim();
  if (isLocale(normalized)) {
    return normalized;
  }

  const base = normalized.split("-")[0];
  return isLocale(base) ? base : null;
}

export function resolveLocale(input: {
  headerLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const fromHeader = normalizeLocale(input.headerLocale);
  if (fromHeader) {
    return fromHeader;
  }

  const fromCookie = normalizeLocale(input.cookieLocale);
  if (fromCookie) {
    return fromCookie;
  }

  const primaryAccepted = input.acceptLanguage?.split(",")[0] ?? null;
  const fromAcceptLanguage = normalizeLocale(primaryAccepted);
  if (fromAcceptLanguage) {
    return fromAcceptLanguage;
  }

  return DEFAULT_LOCALE;
}
