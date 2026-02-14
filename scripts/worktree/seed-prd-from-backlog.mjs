#!/usr/bin/env node
import fs from "node:fs";

function readPathFromEnv(envKey, fallback) {
  const value = process.env[envKey];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

const BACKLOG_PATH = readPathFromEnv("LOOP_BACKLOG_PATH", "docs/GROWTH_BACKLOG.md");
const PRD_PATH = readPathFromEnv("LOOP_PRD_PATH", "loop/prd.json");

function readPrd() {
  if (!fs.existsSync(PRD_PATH)) {
    return { project: "extension-converter", userStories: [] };
  }
  return JSON.parse(fs.readFileSync(PRD_PATH, "utf8"));
}

function hasPendingStory(prd) {
  if (!Array.isArray(prd?.userStories)) return false;
  return prd.userStories.some((story) => story && story.passes !== true);
}

function parseOpenBacklogLine(line) {
  const match = line.match(/^- \[ \] `([^`]+)` \| (.+)$/);
  if (!match) return null;

  const slug = match[1];
  const parts = match[2].split("|").map((part) => part.trim());
  const title = parts[0] || slug;
  let metric = "";
  let owner = "";

  for (let i = 1; i < parts.length; i += 1) {
    const kv = parts[i].match(/^([^:]+):\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1].trim().toLowerCase();
    const value = kv[2].trim();
    if (key === "metric") metric = value;
    if (key === "owner") owner = value;
  }

  return { slug, title, metric, owner };
}

function buildSeededPrd(previousPrd, ticket) {
  const metricText = ticket.metric || "target metric";
  const notes = [
    "seeded_from_backlog=true",
    ticket.metric ? `metric=${ticket.metric}` : "",
    ticket.owner ? `owner=${ticket.owner}` : "",
  ].filter(Boolean).join("; ");

  return {
    ...previousPrd,
    project: typeof previousPrd?.project === "string" && previousPrd.project ? previousPrd.project : "extension-converter",
    branchName: `agent/growth/${ticket.slug}`,
    description: `Auto-seeded from backlog: ${ticket.title}`,
    userStories: [
      {
        id: "US-001",
        title: ticket.title,
        description: `Implement backlog ticket \`${ticket.slug}\` with measurable impact on ${metricText}.`,
        acceptanceCriteria: [
          `Backlog ticket \`${ticket.slug}\` is implemented.`,
          "npm run lint passes",
          "npm run build passes",
          "npm run test:e2e passes",
        ],
        priority: 1,
        passes: false,
        notes,
      },
    ],
  };
}

function main() {
  let prd;
  try {
    prd = readPrd();
  } catch (error) {
    console.error(`[prd-seed] failed to read PRD: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  if (hasPendingStory(prd)) {
    console.log("[prd-seed] pending story exists; no reseed");
    process.exit(0);
  }

  if (!fs.existsSync(BACKLOG_PATH)) {
    console.log("[prd-seed] backlog missing; no reseed");
    process.exit(0);
  }

  const backlogText = fs.readFileSync(BACKLOG_PATH, "utf8");
  const lines = backlogText.split("\n");
  const openIndex = lines.findIndex((line) => line.startsWith("- [ ] `"));
  if (openIndex === -1) {
    console.log("[prd-seed] no open backlog item; no reseed");
    process.exit(0);
  }

  const ticket = parseOpenBacklogLine(lines[openIndex]);
  if (!ticket) {
    console.error(`[prd-seed] malformed backlog line: ${lines[openIndex]}`);
    process.exit(1);
  }

  const nextPrd = buildSeededPrd(prd, ticket);
  lines[openIndex] = lines[openIndex].replace("- [ ]", "- [x]");

  try {
    fs.writeFileSync(PRD_PATH, `${JSON.stringify(nextPrd, null, 2)}\n`, "utf8");
    fs.writeFileSync(BACKLOG_PATH, `${lines.join("\n").replace(/\s*$/, "")}\n`, "utf8");
  } catch (error) {
    console.error(`[prd-seed] failed to write outputs: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`[prd-seed] seeded PRD from backlog ticket: ${ticket.slug}`);
}

main();
