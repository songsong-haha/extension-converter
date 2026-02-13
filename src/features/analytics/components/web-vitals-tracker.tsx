"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/features/analytics/lib/ga";

const PERFORMANCE_BUDGETS = {
  mobile: {
    LCP: 2200,
    CLS: 0.1,
  },
  desktop: {
    LCP: 2500,
    CLS: 0.1,
  },
};

function normalizeMetricValue(name: string, value: number): number {
  if (name === "CLS") {
    return Number(value.toFixed(4));
  }
  return Math.round(value);
}

function detectBudgetProfile(): "mobile" | "desktop" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "desktop";
  }

  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}

export default function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    const budgetProfile = detectBudgetProfile();
    const normalizedValue = normalizeMetricValue(metric.name, metric.value);
    const budget = PERFORMANCE_BUDGETS[budgetProfile][
      metric.name as keyof (typeof PERFORMANCE_BUDGETS)["mobile"]
    ];
    const isOverBudget = typeof budget === "number" ? normalizedValue > budget : false;

    trackEvent("web_vital_measured", {
      metric_name: metric.name,
      metric_value: normalizedValue,
      metric_rating: metric.rating,
      metric_id: metric.id,
      metric_delta: normalizeMetricValue(metric.name, metric.delta),
      metric_navigation_type: metric.navigationType,
      metric_budget_profile: budgetProfile,
      metric_budget: typeof budget === "number" ? budget : undefined,
      metric_within_budget: typeof budget === "number" ? !isOverBudget : undefined,
    });

    if (typeof budget === "number" && isOverBudget) {
      trackEvent("performance_budget_exceeded", {
        metric_name: metric.name,
        metric_value: normalizedValue,
        metric_budget: budget,
        metric_over_budget: Number((normalizedValue - budget).toFixed(4)),
        metric_rating: metric.rating,
        metric_budget_profile: budgetProfile,
      });
    }
  });

  return null;
}
