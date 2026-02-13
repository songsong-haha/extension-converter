import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE_NAME, LOCALE_HEADER_NAME } from "./src/i18n/constants";
import { resolveLocale } from "./src/i18n/resolve-locale";

function normalizeCandidate(value: string): string {
  return value.trim().toLowerCase().split("-")[0];
}

export function middleware(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang") ?? undefined;
  const locale = resolveLocale({
    langParam,
    persistedLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER_NAME, locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (langParam && normalizeCandidate(langParam) === locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
