export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const EVENT_SCHEMA_VERSION = "v1";

export type AnalyticsEventName =
  | "file_selected"
  | "format_selected"
  | "pre_conversion_dropoff"
  | "conversion_started"
  | "conversion_completed"
  | "conversion_failed"
  | "conversion_retry_started"
  | "conversion_retry_result"
  | "file_downloaded";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

export function trackPageView(url: string): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", "page_view", {
    page_location: url,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackEvent(name: AnalyticsEventName, params: EventParams = {}): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) {
    return;
  }

  const uiLocale = document.documentElement.lang || "ko";
  const themeMode = document.documentElement.dataset.theme || "dark";

  window.gtag("event", name, {
    event_schema_version: EVENT_SCHEMA_VERSION,
    ui_locale: uiLocale,
    theme_mode: themeMode,
    ...params,
    send_to: GA_MEASUREMENT_ID,
  });
}
