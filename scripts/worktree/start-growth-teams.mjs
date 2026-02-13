#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const BACKLOG_PATH = "docs/GROWTH_BACKLOG.md";
const DEFAULT_TEAM_COUNT = 3;
const args = process.argv.slice(2);
const teamCount = Number(args[0] || DEFAULT_TEAM_COUNT);
const baseBranch = args[1] || "main";

if (!Number.isInteger(teamCount) || teamCount <= 0) {
  console.error("Usage: node scripts/worktree/start-growth-teams.mjs [team-count] [base-branch]");
  process.exit(1);
}

if (!fs.existsSync(BACKLOG_PATH)) {
  console.error(`[growth-loop] backlog missing: ${BACKLOG_PATH}`);
  process.exit(1);
}

const backlog = fs.readFileSync(BACKLOG_PATH, "utf8").split("\n");
const openSlugs = [];
for (const line of backlog) {
  const match = line.trim().match(/^- \[ \] `([^`]+)`/);
  if (match) openSlugs.push(match[1]);
}

if (openSlugs.length === 0) {
  console.log("[growth-loop] no open backlog task to start");
  process.exit(0);
}

let started = 0;
let attempted = 0;

for (const slug of openSlugs) {
  if (attempted >= teamCount) break;
  attempted += 1;

  const branchCheck = spawnSync("git", ["rev-parse", "--verify", `agent/growth/${slug}`], {
    encoding: "utf8",
    stdio: "ignore",
  });
  if (branchCheck.status === 0) {
    console.log(`[growth-loop] skip existing task branch: agent/growth/${slug}`);
    continue;
  }

  console.log(`[growth-loop] starting team for task: ${slug}`);
  const run = spawnSync("node", ["scripts/worktree/start-growth-task.mjs", slug, baseBranch], {
    stdio: "inherit",
  });
  if (run.status !== 0) {
    console.error(`[growth-loop] failed to start team for task: ${slug}`);
    process.exit(run.status || 1);
  }
  started += 1;
}

console.log(`[growth-loop] started ${started} team(s), requested up to ${teamCount}`);
