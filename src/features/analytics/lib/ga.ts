export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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

  window.gtag("event", name, {
    ...params,
    send_to: GA_MEASUREMENT_ID,
  });
}
