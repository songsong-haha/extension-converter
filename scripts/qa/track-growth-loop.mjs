#!/usr/bin/env node
import fs from "node:fs";

const BACKLOG_PATH = process.env.LOOP_BACKLOG_PATH || "docs/GROWTH_BACKLOG.md";
const AI_REPORT_PATH = process.env.LOOP_AI_REPORT_PATH || "test-results/ai-qa/report.md";
const PW_RESULTS_PATH = process.env.LOOP_PLAYWRIGHT_RESULTS_PATH || "test-results/playwright/results.json";
const ANALYTICS_PATH = process.env.LOOP_ANALYTICS_EVENTS_PATH || "test-results/analytics/events.ndjson";
const OUTPUT_PATH = process.env.LOOP_GROWTH_DASHBOARD_PATH || "test-results/ai-qa/dashboard.md";

function parseBacklog() {
  if (!fs.existsSync(BACKLOG_PATH)) return { total: 0, done: 0, next: null };
  const lines = fs.readFileSync(BACKLOG_PATH, "utf8").split("\n");
  const items = lines.filter((line) => line.trim().startsWith("- ["));
  const done = items.filter((line) => line.includes("- [x]")).length;
  const next = items.find((line) => line.includes("- [ ]")) ?? null;
  return { total: items.length, done, next };
}

function parsePlaywrightSummary() {
  if (!fs.existsSync(PW_RESULTS_PATH)) {
    return { total: 0, passed: 0, failed: 0 };
  }

  const raw = JSON.parse(fs.readFileSync(PW_RESULTS_PATH, "utf8"));
  let total = 0;
  let passed = 0;
  let failed = 0;

  function walkSuite(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        total += 1;
        const outcomes = test.results?.map((r) => r.status) ?? [];
        if (outcomes.includes("failed") || outcomes.includes("timedOut")) failed += 1;
        else if (outcomes.includes("passed")) passed += 1;
      }
    }
    for (const child of suite.suites ?? []) walkSuite(child);
  }

  for (const suite of raw.suites ?? []) walkSuite(suite);
  return { total, passed, failed };
}

function parseAiVerdict() {
  if (!fs.existsSync(AI_REPORT_PATH)) return "UNKNOWN";
  const content = fs.readFileSync(AI_REPORT_PATH, "utf8");
  if (content.includes("- FAIL:")) return "FAIL";
  if (content.includes("- PASS:")) return "PASS";
  return "UNKNOWN";
}

function parseAnalytics() {
  if (!fs.existsSync(ANALYTICS_PATH)) {
    return {
      conversionFailedCount: 0,
      retrySuccess: 0,
      retryFailed: 0,
      topFailureCategory: "unknown",
      recoveryByCategory: "none",
    };
  }

  const lines = fs.readFileSync(ANALYTICS_PATH, "utf8").split(/\r?\n/);
  let conversionFailedCount = 0;
  let retrySuccess = 0;
  let retryFailed = 0;
  const failureCounts = new Map();
  const attemptsByCategory = new Map();
  const successByCategory = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event?.name === "conversion_failed") {
      conversionFailedCount += 1;
      const category = String(event?.params?.failure_category || "unknown");
      failureCounts.set(category, (failureCounts.get(category) || 0) + 1);
    }

    if (event?.name === "conversion_retry_result") {
      const outcome = String(event?.params?.retry_outcome || "");
      const category = String(event?.params?.previous_failure_category || "unknown");
      attemptsByCategory.set(category, (attemptsByCategory.get(category) || 0) + 1);
      if (outcome === "success") {
        retrySuccess += 1;
        successByCategory.set(category, (successByCategory.get(category) || 0) + 1);
      } else if (outcome === "failed") {
        retryFailed += 1;
      }
    }
  }

  let topFailureCategory = "unknown";
  let maxCount = 0;
  for (const [category, count] of failureCounts.entries()) {
    if (count > maxCount) {
      topFailureCategory = category;
      maxCount = count;
    }
  }

  let recoveryByCategory = "none";
  if (attemptsByCategory.size > 0) {
    const parts = [];
    for (const [category, attempts] of attemptsByCategory.entries()) {
      const success = successByCategory.get(category) || 0;
      const pct = attempts > 0 ? Math.round((success / attempts) * 100) : 0;
      parts.push(`${category}:${success}/${attempts}(${pct}%)`);
    }
    recoveryByCategory = parts.join(", ");
  }

  return {
    conversionFailedCount,
    retrySuccess,
    retryFailed,
    topFailureCategory,
    recoveryByCategory,
  };
}

function main() {
  const now = new Date().toISOString();
  const backlog = parseBacklog();
  const pw = parsePlaywrightSummary();
  const aiVerdict = parseAiVerdict();
  const analytics = parseAnalytics();

  fs.mkdirSync(requireOutputDir(), { recursive: true });

  const donePercent = backlog.total > 0 ? Math.round((backlog.done / backlog.total) * 100) : 0;
  const retrySuccessRate = analytics.conversionFailedCount > 0
    ? ((analytics.retrySuccess / analytics.conversionFailedCount) * 100).toFixed(1)
    : "0";

  const lines = [
    "# Growth Loop Dashboard",
    "",
    `- generated_at_utc: ${now}`,
    `- backlog_progress: ${backlog.done}/${backlog.total} (${donePercent}%)`,
    `- playwright: total=${pw.total}, passed=${pw.passed}, failed=${pw.failed}`,
    `- ai_gate_verdict: ${aiVerdict}`,
    `- conversion_failed_to_retry_success_rate: ${retrySuccessRate}% (${analytics.retrySuccess}/${analytics.conversionFailedCount})`,
    `- conversion_retry_result: success=${analytics.retrySuccess}, failed=${analytics.retryFailed}`,
    `- top_conversion_failure_category: ${analytics.topFailureCategory}`,
    `- retry_recovery_by_failure_category: ${analytics.recoveryByCategory}`,
    "",
    "## Next Micro Task",
    backlog.next ?? "- [ ] 백로그 항목이 없습니다.",
    "",
  ];

  fs.writeFileSync(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`[track-growth-loop] dashboard generated: ${OUTPUT_PATH}`);
}

function requireOutputDir() {
  const dir = OUTPUT_PATH.includes("/") ? OUTPUT_PATH.slice(0, OUTPUT_PATH.lastIndexOf("/")) : ".";
  return dir || ".";
}

main();
