#!/usr/bin/env node
import fs from "node:fs";

const BACKLOG_PATH = process.env.LOOP_BACKLOG_PATH || "docs/GROWTH_BACKLOG.md";
const PRD_PATH = process.env.LOOP_PRD_PATH || "loop/prd.json";
const PROJECT_NAME = process.env.LOOP_PROJECT_NAME || "extension-converter";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hasPendingStory(prd) {
  if (!Array.isArray(prd?.userStories)) return false;
  return prd.userStories.some((story) => story && story.passes === false);
}

function parseOpenTicket(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("- [ ]")) return null;
  const parts = trimmed.split("|").map((x) => x.trim());
  if (parts.length < 3) return null;

  const slugMatch = parts[0].match(/^- \[ \] `([^`]+)`$/);
  if (!slugMatch) return null;
  const title = parts[1];
  const metricPart = parts.find((p) => p.startsWith("metric: "));
  const ownerPart = parts.find((p) => p.startsWith("owner: "));
  if (!metricPart) return null;

  return {
    slug: slugMatch[1].trim(),
    title,
    metric: metricPart.replace(/^metric:\s*/, "").trim(),
    owner: (ownerPart || "").replace(/^owner:\s*/, "").trim(),
  };
}

function main() {
  if (!fs.existsSync(BACKLOG_PATH)) {
    console.log(`[prd-seed] backlog not found: ${BACKLOG_PATH}`);
    process.exit(0);
  }
  if (!fs.existsSync(PRD_PATH)) {
    console.log(`[prd-seed] prd not found: ${PRD_PATH}`);
    process.exit(0);
  }

  const prd = readJson(PRD_PATH);
  if (hasPendingStory(prd)) {
    console.log("[prd-seed] pending story exists; no reseed");
    process.exit(0);
  }

  const backlogText = fs.readFileSync(BACKLOG_PATH, "utf8");
  const lines = backlogText.split("\n");

  let openIndex = -1;
  let ticket = null;
  for (let i = 0; i < lines.length; i += 1) {
    const parsed = parseOpenTicket(lines[i]);
    if (parsed) {
      openIndex = i;
      ticket = parsed;
      break;
    }
  }

  if (!ticket) {
    console.log("[prd-seed] no open backlog ticket found; no reseed");
    process.exit(0);
  }

  const nextPrd = {
    project: prd.project || PROJECT_NAME,
    branchName: `agent/growth/${ticket.slug}`,
    description: `Auto-seeded from backlog: ${ticket.title}`,
    userStories: [
      {
        id: "US-001",
        title: ticket.title,
        description: `Implement backlog ticket \`${ticket.slug}\` with measurable impact on ${ticket.metric}.`,
        acceptanceCriteria: [
          `Backlog ticket \`${ticket.slug}\` is implemented.`,
          "npm run lint passes",
          "npm run build passes",
          "npm run test:e2e passes",
        ],
        priority: 1,
        passes: false,
        notes: `seeded_from_backlog=true; metric=${ticket.metric}; owner=${ticket.owner || "unknown"}`,
      },
    ],
  };

  lines[openIndex] = lines[openIndex].replace("- [ ]", "- [x]");
  fs.writeFileSync(BACKLOG_PATH, `${lines.join("\n")}\n`, "utf8");
  writeJson(PRD_PATH, nextPrd);

  console.log(
    `[prd-seed] seeded PRD from backlog ticket: ${ticket.slug} | branch=agent/growth/${ticket.slug}`
  );
}

main();
