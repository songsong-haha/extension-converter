#!/usr/bin/env node
import fs from "node:fs";

const BACKLOG_PATH = "docs/GROWTH_BACKLOG.md";
const MIN_OPEN_TICKETS = 5;
const OWNER = "ceo+growth+qa+analytics+designer";

const TEMPLATES = [
  {
    baseSlug: "full-i18n-rollout-ko-en",
    title: "KO/EN 전역 i18n 인프라 + 핵심 화면 카피/FAQ 일괄 전환",
    metric: "non-ko conversion_completed rate",
    estimate: "25-50m",
    source: "project-report P1: i18n and accessibility",
  },
  {
    baseSlug: "theme-system-and-dark-mode",
    title: "테마 토큰 재정의 + 다크모드 토글 + 랜딩/변환/결과 화면 적용",
    metric: "dark_mode_session conversion_completed rate",
    estimate: "20-40m",
    source: "project-report P1: theme and dark mode",
  },
  {
    baseSlug: "performance-budget-and-image-optimization",
    title: "LCP/CLS 성능 예산 + 이미지 최적화 + 측정 이벤트 연결",
    metric: "mobile bounce rate",
    estimate: "20-35m",
    source: "project-report P1: performance and UX quality",
  },
  {
    baseSlug: "ad-placement-post-conversion",
    title: "광고 노출 위치를 변환 이후 단계로 재배치 + 간섭 최소화",
    metric: "conversion_completed rate",
    estimate: "15-30m",
    source: "project-report P0: ad UX sequencing",
  },
  {
    baseSlug: "conversion-failure-observability",
    title: "실패 원인 분류/재시도 결과 추적 이벤트 + 리포트 파이프라인",
    metric: "conversion_failed_to_retry_success rate",
    estimate: "20-35m",
    source: "project-report P0/P1: observability and recovery",
  },
];

function ensureBacklogFile() {
  if (fs.existsSync(BACKLOG_PATH)) {
    return;
  }

  const initial = [
    "# Growth Micro-Task Backlog",
    "",
    "When open backlog is below 5, auto-topup adds tickets from `project-report.md` until it reaches 5.",
    "Each ticket should require at least 10 minutes of pure implementation work (excluding tests/lint/build).",
    "",
  ].join("\n");

  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync(BACKLOG_PATH, initial, "utf8");
}

function getNextPhaseNumber(content) {
  const matches = [...content.matchAll(/-phase-(\d+)/g)];
  if (matches.length === 0) {
    return 1;
  }

  let max = 0;
  for (const match of matches) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max + 1;
}

function main() {
  ensureBacklogFile();

  const content = fs.readFileSync(BACKLOG_PATH, "utf8");
  const lines = content.split("\n");
  const openLines = lines.filter((line) => line.trim().startsWith("- [ ] `"));
  const openCount = openLines.length;

  if (openCount >= MIN_OPEN_TICKETS) {
    console.log(`[backlog-ensure] open tickets sufficient (${openCount}/${MIN_OPEN_TICKETS}), no action`);
    return;
  }

  const needed = MIN_OPEN_TICKETS - openCount;
  const existingSlugs = new Set(
    [...content.matchAll(/- \[[ x]\] `([^`]+)`/g)].map((match) => match[1]),
  );

  const additions = [];
  let phase = getNextPhaseNumber(content);

  while (additions.length < needed) {
    const template = TEMPLATES[(phase - 1) % TEMPLATES.length];
    const slug = `${template.baseSlug}-phase-${phase}`;

    if (existingSlugs.has(slug)) {
      phase += 1;
      continue;
    }

    const line = `- [ ] \`${slug}\` | ${template.title} (Phase ${phase}) | metric: ${template.metric} | owner: ${OWNER} | estimate: ${template.estimate} | source: ${template.source}`;
    additions.push({ slug, line });
    existingSlugs.add(slug);
    phase += 1;
  }

  const nextContent = `${content.replace(/\s*$/, "")}\n\n${additions.map((item) => item.line).join("\n")}\n`;
  fs.writeFileSync(BACKLOG_PATH, nextContent, "utf8");

  console.log(
    `[backlog-ensure] open tickets ${openCount}/${MIN_OPEN_TICKETS}; added ${additions.length} ticket(s): ${additions.map((item) => item.slug).join(", ")}`,
  );
}

main();
