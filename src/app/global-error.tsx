"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import type { Locale } from "@/i18n/messages";
import { resolveLocale } from "@/i18n/resolve-locale";

const GLOBAL_ERROR_MESSAGES: Record<Locale, { heading: string; body: string }> = {
  ko: {
    heading: "오류가 발생했습니다.",
    body: "잠시 후 다시 시도해 주세요.",
  },
  en: {
    heading: "Something went wrong.",
    body: "Please try again in a moment.",
  },
};

function detectClientLocale(): Locale {
  if (typeof document === "undefined" && typeof navigator === "undefined") {
    return "ko";
  }

  return resolveLocale({
    headerLocale: typeof document !== "undefined" ? document.documentElement.lang : undefined,
    acceptLanguage: typeof navigator !== "undefined" ? navigator.language : null,
  });
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const locale = detectClientLocale();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const messages = GLOBAL_ERROR_MESSAGES[locale];

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <h1>{messages.heading}</h1>
        <p>{messages.body}</p>
      </body>
    </html>
  );
}
