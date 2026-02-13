import { DEFAULT_LOCALE, type Locale, isSupportedLocale } from "./messages";

interface ResolveLocaleOptions {
  langParam?: string | string[];
  persistedLocale?: string | null;
  acceptLanguage?: string | null;
}

function normalizeLocaleCandidate(value: string): string {
  return value.trim().toLowerCase().split("-")[0];
}

function parseAcceptLanguage(acceptLanguage: string): string[] {
  return acceptLanguage
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number(qParam.split("=")[1]) : 1;
      return {
        tag: normalizeLocaleCandidate(rawTag),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.quality - a.quality)
    .map((entry) => entry.tag);
}

export function resolveLocale({
  langParam,
  persistedLocale,
  acceptLanguage,
}: ResolveLocaleOptions): Locale {
  const normalizedLangParam = Array.isArray(langParam) ? langParam[0] : langParam;
  if (normalizedLangParam) {
    const fromParam = normalizeLocaleCandidate(normalizedLangParam);
    if (isSupportedLocale(fromParam)) {
      return fromParam;
    }
  }

  if (persistedLocale) {
    const fromPersistedLocale = normalizeLocaleCandidate(persistedLocale);
    if (isSupportedLocale(fromPersistedLocale)) {
      return fromPersistedLocale;
    }
  }

  if (acceptLanguage) {
    const candidates = parseAcceptLanguage(acceptLanguage);
    for (const candidate of candidates) {
      if (isSupportedLocale(candidate)) {
        return candidate;
      }
    }
  }

  return DEFAULT_LOCALE;
}
