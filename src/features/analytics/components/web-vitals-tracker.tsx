"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/features/analytics/lib/ga";

const PERFORMANCE_BUDGETS: Record<string, number> = {
  LCP: 2500,
  CLS: 0.1,
};

function normalizeMetricValue(name: string, value: number): number {
  if (name === "CLS") {
    return Number(value.toFixed(4));
  }
  return Math.round(value);
}

export default function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    const normalizedValue = normalizeMetricValue(metric.name, metric.value);
    const budget = PERFORMANCE_BUDGETS[metric.name];

    trackEvent("web_vital_measured", {
      metric_name: metric.name,
      metric_value: normalizedValue,
      metric_rating: metric.rating,
      metric_id: metric.id,
      metric_delta: normalizeMetricValue(metric.name, metric.delta),
      metric_navigation_type: metric.navigationType,
    });

    if (typeof budget === "number" && normalizedValue > budget) {
      trackEvent("performance_budget_exceeded", {
        metric_name: metric.name,
        metric_value: normalizedValue,
        metric_budget: budget,
        metric_over_budget: Number((normalizedValue - budget).toFixed(4)),
        metric_rating: metric.rating,
      });
    }
  });

  return null;
}
