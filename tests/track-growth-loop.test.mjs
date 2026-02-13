import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT_PATH = path.join(process.cwd(), "scripts/qa/track-growth-loop.mjs");

function runTrackGrowth(env) {
  return spawnSync("node", [SCRIPT_PATH], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("builds dashboard with retry success metric and top failure category", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-track-"));
  const backlogPath = path.join(tempDir, "backlog.md");
  const aiReportPath = path.join(tempDir, "ai-report.md");
  const pwResultsPath = path.join(tempDir, "pw-results.json");
  const analyticsPath = path.join(tempDir, "events.ndjson");
  const dashboardPath = path.join(tempDir, "dashboard.md");

  fs.writeFileSync(
    backlogPath,
    [
      "# Backlog",
      "- [x] `done-item` | done",
      "- [ ] `next-item` | next",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(aiReportPath, "- PASS: ai check\n", "utf8");
  fs.writeFileSync(
    pwResultsPath,
    JSON.stringify({
      suites: [
        {
          specs: [
            {
              tests: [{ results: [{ status: "passed" }] }],
            },
            {
              tests: [{ results: [{ status: "failed" }] }],
            },
          ],
        },
      ],
    }),
    "utf8",
  );
  fs.writeFileSync(
    analyticsPath,
    [
      JSON.stringify({ name: "conversion_failed", params: { failure_category: "image_decode_failed" } }),
      JSON.stringify({ name: "conversion_failed", params: { failure_category: "memory_limit_exceeded" } }),
      JSON.stringify({ name: "conversion_failed", params: { failure_category: "image_decode_failed" } }),
      JSON.stringify({ name: "conversion_retry_result", params: { retry_outcome: "success" } }),
      JSON.stringify({ name: "conversion_retry_result", params: { retry_outcome: "failed" } }),
      "{malformed",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runTrackGrowth({
    LOOP_BACKLOG_PATH: backlogPath,
    LOOP_AI_REPORT_PATH: aiReportPath,
    LOOP_PLAYWRIGHT_RESULTS_PATH: pwResultsPath,
    LOOP_ANALYTICS_EVENTS_PATH: analyticsPath,
    LOOP_GROWTH_DASHBOARD_PATH: dashboardPath,
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /dashboard generated/);

  const dashboard = fs.readFileSync(dashboardPath, "utf8");
  assert.match(dashboard, /backlog_progress: 1\/2 \(50%\)/);
  assert.match(dashboard, /playwright: total=2, passed=1, failed=1/);
  assert.match(dashboard, /ai_gate_verdict: PASS/);
  assert.match(dashboard, /conversion_failed_to_retry_success_rate: 33.3% \(1\/3\)/);
  assert.match(dashboard, /conversion_retry_result: success=1, failed=1/);
  assert.match(dashboard, /top_conversion_failure_category: image_decode_failed/);
  assert.match(dashboard, /- \[ \] `next-item` \| next/);
});

test("falls back to zeroed analytics summary when events file is missing", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-track-"));
  const backlogPath = path.join(tempDir, "backlog.md");
  const dashboardPath = path.join(tempDir, "dashboard.md");

  fs.writeFileSync(backlogPath, "- [ ] `first-item` | first\n", "utf8");

  const result = runTrackGrowth({
    LOOP_BACKLOG_PATH: backlogPath,
    LOOP_GROWTH_DASHBOARD_PATH: dashboardPath,
    LOOP_ANALYTICS_EVENTS_PATH: path.join(tempDir, "missing-events.ndjson"),
    LOOP_AI_REPORT_PATH: path.join(tempDir, "missing-ai.md"),
    LOOP_PLAYWRIGHT_RESULTS_PATH: path.join(tempDir, "missing-pw.json"),
  });

  assert.equal(result.status, 0);
  const dashboard = fs.readFileSync(dashboardPath, "utf8");
  assert.match(dashboard, /ai_gate_verdict: UNKNOWN/);
  assert.match(dashboard, /playwright: total=0, passed=0, failed=0/);
  assert.match(dashboard, /conversion_failed_to_retry_success_rate: 0% \(0\/0\)/);
  assert.match(dashboard, /conversion_retry_result: success=0, failed=0/);
  assert.match(dashboard, /top_conversion_failure_category: unknown/);
});
