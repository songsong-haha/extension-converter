#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { branchExists, commandExists, fail, gitOrFail, repoRootOrFail } from "./lib.mjs";

if (!commandExists("git")) fail("Error: git is required");

const [agentName, taskSlug, maybeDelete] = process.argv.slice(2);
if (!agentName || !taskSlug) {
  console.error("Usage: node scripts/worktree/remove-agent.mjs <agent-name> <task-slug> [--delete-branch]");
  process.exit(1);
}

const deleteBranch = maybeDelete === "--delete-branch";
const repoRoot = repoRootOrFail();
const worktreePath = path.join(repoRoot, ".worktrees", `${agentName}-${taskSlug}`);
const metadataPath = path.join(repoRoot, ".agents", `${agentName}-${taskSlug}.json`);
const taskCardPath = path.join(repoRoot, ".agents", `${agentName}-${taskSlug}.md`);
const branch = `agent/${agentName}/${taskSlug}`;

if (!fs.existsSync(worktreePath)) fail(`Error: worktree not found: ${worktreePath}`);

gitOrFail(["worktree", "remove", worktreePath], { stdio: "inherit" });
fs.rmSync(metadataPath, { force: true });
fs.rmSync(taskCardPath, { force: true });

gitOrFail(["worktree", "prune"], { stdio: "inherit" });

if (deleteBranch && branchExists(branch)) {
  gitOrFail(["branch", "-D", branch], { stdio: "inherit" });
  console.log(`Deleted branch: ${branch}`);
}

console.log(`Removed agent worktree: ${agentName}-${taskSlug}`);
