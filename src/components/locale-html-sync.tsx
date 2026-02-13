"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/messages";

interface LocaleHtmlSyncProps {
  locale: Locale;
}

export default function LocaleHtmlSync({ locale }: LocaleHtmlSyncProps) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
