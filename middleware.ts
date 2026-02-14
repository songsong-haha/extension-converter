import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE_NAME, LOCALE_HEADER_NAME } from "@/i18n/constants";
import { resolveLocale } from "@/i18n/resolve-locale";

export function middleware(request: NextRequest): NextResponse {
  const locale = resolveLocale({
    cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER_NAME, locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale) {
    response.cookies.set({
      name: LOCALE_COOKIE_NAME,
      value: locale,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
