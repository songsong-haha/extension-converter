export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export type AnalyticsEventName =
  | "file_selected"
  | "format_selected"
  | "format_guidance_exposed"
  | "format_guidance_quick_selected"
  | "format_guidance_bypassed"
  | "pre_conversion_dropoff"
  | "conversion_started"
  | "conversion_completed"
  | "post_conversion_ad_impression"
  | "post_conversion_ad_click"
  | "conversion_failed"
  | "conversion_retry_started"
  | "conversion_retry_result"
  | "file_downloaded"
  | "preview_image_optimized"
  | "preview_image_optimization_evaluated"
  | "web_vital_measured"
  | "performance_budget_exceeded";

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
