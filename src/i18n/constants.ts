export const LOCALE_HEADER_NAME = "x-extension-converter-locale";
export const LOCALE_COOKIE_NAME = "extension_converter_locale";

export const SUPPORTED_LOCALES = ["ko", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";
