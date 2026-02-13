#!/usr/bin/env node
import fs from "node:fs";

const BACKLOG_PATH = "docs/GROWTH_BACKLOG.md";
const AI_REPORT_PATH = "test-results/ai-qa/report.md";
const PW_RESULTS_PATH = "test-results/playwright/results.json";
const OUTPUT_PATH = "test-results/ai-qa/dashboard.md";

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

function main() {
  const now = new Date().toISOString();
  const backlog = parseBacklog();
  const pw = parsePlaywrightSummary();
  const aiVerdict = parseAiVerdict();

  fs.mkdirSync("test-results/ai-qa", { recursive: true });

  const donePercent = backlog.total > 0 ? Math.round((backlog.done / backlog.total) * 100) : 0;

  const lines = [
    "# Growth Loop Dashboard",
    "",
    `- generated_at_utc: ${now}`,
    `- backlog_progress: ${backlog.done}/${backlog.total} (${donePercent}%)`,
    `- playwright: total=${pw.total}, passed=${pw.passed}, failed=${pw.failed}`,
    `- ai_gate_verdict: ${aiVerdict}`,
    "",
    "## Next Micro Task",
    backlog.next ?? "- [ ] 백로그 항목이 없습니다.",
    "",
    "## Merge Policy Snapshot",
    "- QA branch required",
    "- Playwright test pass required",
    "- qa:gate pass required before merge",
    "",
  ];

  fs.writeFileSync(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`[track-growth-loop] dashboard generated: ${OUTPUT_PATH}`);
}

main();
