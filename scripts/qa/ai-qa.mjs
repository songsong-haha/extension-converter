#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const RESULTS_PATH = "test-results/playwright/results.json";
const OUTPUT_DIR = "test-results/ai-qa";
const OUTPUT_PATH = path.join(OUTPUT_DIR, "report.md");

function summarizePlaywrightResults(raw) {
  let total = 0;
  let passed = 0;
  let failed = 0;

  for (const suite of raw.suites ?? []) {
    walkSuite(suite);
  }

  function walkSuite(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        total += 1;
        const outcomes = test.results?.map((r) => r.status) ?? [];
        if (outcomes.includes("failed") || outcomes.includes("timedOut")) {
          failed += 1;
        } else if (outcomes.includes("passed")) {
          passed += 1;
        }
      }
    }
    for (const child of suite.suites ?? []) {
      walkSuite(child);
    }
  }

  return { total, passed, failed };
}

async function requestAiSummary(context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const payload = {
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "You are a QA lead for a conversion website. Provide concise Korean recommendations focused on growth risk, UX bugs, and ad-revenue impact.",
      },
      {
        role: "user",
        content: `Playwright summary: ${JSON.stringify(context)}`,
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`AI QA request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.output_text?.trim() || null;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let summary = { total: 0, passed: 0, failed: 0 };
  let hasResults = false;

  if (fs.existsSync(RESULTS_PATH)) {
    hasResults = true;
    const raw = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));
    summary = summarizePlaywrightResults(raw);
  }

  let aiText = null;
  try {
    aiText = await requestAiSummary(summary);
  } catch (error) {
    aiText = `AI 호출 실패: ${error instanceof Error ? error.message : String(error)}`;
  }

  const now = new Date().toISOString();
  const lines = [
    "# AI QA Report",
    "",
    `- generated_at_utc: ${now}`,
    `- playwright_results_found: ${hasResults}`,
    `- total_tests: ${summary.total}`,
    `- passed_tests: ${summary.passed}`,
    `- failed_tests: ${summary.failed}`,
    "",
    "## Gate Verdict",
    summary.failed > 0 ? "- FAIL: 테스트 실패가 존재합니다." : "- PASS: 테스트 실패가 없습니다.",
    "",
    "## Heuristic Notes",
    "- 핵심 랜딩 카피/CTA가 렌더링되는지 Playwright E2E로 확인하세요.",
    "- 전환 퍼널 이벤트(`file_selected`, `conversion_started`, `conversion_completed`) 누락 여부를 점검하세요.",
    "- 실패 테스트가 1개라도 있으면 merge 금지 규칙을 유지하세요.",
    "",
    "## AI Recommendations",
    aiText ? aiText : "- OPENAI_API_KEY 미설정: AI 요약을 건너뛰고 휴리스틱 리포트만 생성했습니다.",
    "",
  ];

  fs.writeFileSync(OUTPUT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`[ai-qa] report generated: ${OUTPUT_PATH}`);

  if (summary.failed > 0) {
    process.exit(2);
  }
}

main();
