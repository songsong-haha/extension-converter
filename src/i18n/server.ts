import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, LOCALE_HEADER_NAME, type Locale } from "./constants";
import { resolveLocale } from "./resolve-locale";

export async function getRequestLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const requestCookies = await cookies();

  return resolveLocale({
    headerLocale: requestHeaders.get(LOCALE_HEADER_NAME),
    cookieLocale: requestCookies.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}
