#!/usr/bin/env node
import fs from "node:fs";

const BACKLOG_PATH = process.env.LOOP_BACKLOG_PATH || "docs/GROWTH_BACKLOG.md";
const REPORT_PATH = process.env.LOOP_REPORT_PATH || "project-report.md";
const CORE_OWNER = "ceo+growth+qa+analytics+designer";
const MIN_OPEN_TICKETS = Number(process.env.LOOP_MIN_OPEN_TICKETS || 5);

const CANDIDATES = [
  {
    slug: "trust-error-ux-flow",
    title: "신뢰 메시지+실패 가이드+재시도/대체포맷 UX 통합 리팩터",
    metric: "upload_to_conversion_completed rate",
    estimate: "20-40m",
    source: "project-report P0: trust and error UX",
  },
  {
    slug: "full-i18n-rollout-ko-en",
    title: "KO/EN 전역 i18n 인프라 + 핵심 화면 카피/FAQ 일괄 전환",
    metric: "non-ko conversion_completed rate",
    estimate: "25-50m",
    source: "project-report P1: i18n and accessibility",
  },
  {
    slug: "theme-system-and-dark-mode",
    title: "테마 토큰 재정의 + 다크모드 토글 + 랜딩/변환/결과 화면 적용",
    metric: "dark_mode_session conversion_completed rate",
    estimate: "20-40m",
    source: "project-report P1: theme and dark mode",
  },
  {
    slug: "performance-budget-and-image-optimization",
    title: "LCP/CLS 성능 예산 + 이미지 최적화 + 측정 이벤트 연결",
    metric: "mobile bounce rate",
    estimate: "20-35m",
    source: "project-report P1: performance and UX quality",
  },
  {
    slug: "ad-placement-post-conversion",
    title: "광고 노출 위치를 변환 이후 단계로 재배치 + 간섭 최소화",
    metric: "conversion_completed rate",
    estimate: "15-30m",
    source: "project-report P0: ad UX sequencing",
  },
  {
    slug: "conversion-failure-observability",
    title: "실패 원인 분류/재시도 결과 추적 이벤트 + 리포트 파이프라인",
    metric: "conversion_failed_to_retry_success rate",
    estimate: "20-35m",
    source: "project-report P0/P1: observability and recovery",
  },
  {
    slug: "format-selection-guidance-experiment",
    title: "포맷 선택 가이드 인라인 UX + 실험 플래그 + 이벤트 계측",
    metric: "format_selected rate",
    estimate: "15-25m",
    source: "project-report P1: selection friction",
  },
];

function fail(message) {
  console.error(`[backlog-ensure] ${message}`);
  process.exit(1);
}

function parseExistingSlugs(backlogText) {
  const slugs = new Set();
  const matches = backlogText.matchAll(/`([^`]+)`/g);
  for (const match of matches) {
    if (match[1]) slugs.add(match[1].trim());
  }
  return slugs;
}

function countOpenTickets(lines) {
  return lines.filter((line) => line.trim().startsWith("- [ ]")).length;
}

function pickNextCandidates(backlogText, count) {
  const existingSlugs = parseExistingSlugs(backlogText);
  const selected = [];
  for (const candidate of CANDIDATES) {
    if (!existingSlugs.has(candidate.slug)) selected.push(candidate);
    if (selected.length >= count) break;
  }

  if (selected.length >= count) return selected;

  const needed = count - selected.length;
  const base = CANDIDATES.length || 1;
  let index = 1;
  while (selected.length < count) {
    const template = CANDIDATES[(index - 1) % base] || {
      slug: "growth-maintenance",
      title: "전환 퍼널 개선 유지보수",
      metric: "conversion_completed rate",
      estimate: "15-30m",
      source: "project-report recurring agenda",
    };
    const slug = `${template.slug}-phase-${index}`;
    if (!existingSlugs.has(slug)) {
      selected.push({
        ...template,
        slug,
        title: `${template.title} (Phase ${index})`,
      });
      existingSlugs.add(slug);
    }
    index += 1;
    if (index > needed + 1000) break;
  }

  return selected;
}

function main() {
  if (!fs.existsSync(BACKLOG_PATH)) fail(`missing backlog file: ${BACKLOG_PATH}`);
  if (!fs.existsSync(REPORT_PATH)) fail(`missing planning source: ${REPORT_PATH}`);
  if (!Number.isInteger(MIN_OPEN_TICKETS) || MIN_OPEN_TICKETS <= 0) {
    fail(`invalid LOOP_MIN_OPEN_TICKETS: ${MIN_OPEN_TICKETS}`);
  }

  const report = fs.readFileSync(REPORT_PATH, "utf8");
  if (!report.includes("MVP")) fail("project-report.md does not look valid");

  const backlogText = fs.readFileSync(BACKLOG_PATH, "utf8");
  const lines = backlogText.split("\n");
  const openCount = countOpenTickets(lines);
  if (openCount >= MIN_OPEN_TICKETS) {
    console.log(`[backlog-ensure] open tickets sufficient (${openCount}/${MIN_OPEN_TICKETS}), no action`);
    return;
  }

  const required = MIN_OPEN_TICKETS - openCount;
  const nextBatch = pickNextCandidates(backlogText, required);
  if (nextBatch.length === 0) fail("no candidate ticket to add");

  const newLines = nextBatch.map(
    (next) =>
      `- [ ] \`${next.slug}\` | ${next.title} | metric: ${next.metric} | owner: ${CORE_OWNER} | estimate: ${next.estimate} | source: ${next.source}`
  );
  const sep = backlogText.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(BACKLOG_PATH, `${backlogText}${sep}${newLines.join("\n")}\n`, "utf8");
  console.log(
    `[backlog-ensure] open tickets ${openCount}/${MIN_OPEN_TICKETS}; added ${newLines.length} ticket(s): ${nextBatch
      .map((x) => x.slug)
      .join(", ")}`
  );
}

main();
