#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { branchExists, commandExists, fail, git, gitOrFail, repoRootOrFail } from "./lib.mjs";

if (!commandExists("git")) fail("Error: git is required");

const [taskSlug] = process.argv.slice(2);
if (!taskSlug) {
  console.error("Usage: node scripts/worktree/reset-task-branches.mjs <task-slug>");
  process.exit(1);
}

const repoRoot = repoRootOrFail();
const metadataDir = path.join(repoRoot, ".agents");
const lanes = ["ceo", "growth", "qa", "analytics", "designer"];
const branches = lanes.map((lane) => `agent/${lane}/${taskSlug}`);

function checkedOutWorktreePath(branch) {
  const result = git(["worktree", "list", "--porcelain"], { stdio: "pipe" });
  if (result.status !== 0) return "";
  const lines = (result.stdout || "").split(/\r?\n/);
  let currentPath = "";
  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      currentPath = line.slice("worktree ".length).trim();
      continue;
    }
    if (line.startsWith("branch refs/heads/")) {
      const currentBranch = line.slice("branch refs/heads/".length).trim();
      if (currentBranch === branch) return currentPath;
    }
  }
  return "";
}

function resetBranch(branch) {
  const lane = branch.split("/")[1];
  const expectedWorktreePath = path.join(repoRoot, ".worktrees", `${lane}-${taskSlug}`);
  const metadataPath = path.join(metadataDir, `${lane}-${taskSlug}.json`);
  const taskCardPath = path.join(metadataDir, `${lane}-${taskSlug}.md`);
  const checkedOutPath = checkedOutWorktreePath(branch);
  const candidates = [];
  if (checkedOutPath && fs.existsSync(checkedOutPath)) candidates.push(checkedOutPath);
  if (fs.existsSync(expectedWorktreePath) && !candidates.includes(expectedWorktreePath)) {
    candidates.push(expectedWorktreePath);
  }

  for (const wtPath of candidates) {
    if (wtPath === repoRoot) {
      fail(`Error: branch ${branch} is checked out in repo root; switch branch and retry reset`);
    }
    console.log(`[reset-task] removing worktree for ${branch}: ${wtPath}`);
    git(["worktree", "remove", "--force", wtPath], { stdio: "inherit" });
  }

  if (branchExists(branch)) {
    git(["branch", "-D", branch], { stdio: "inherit" });
  }

  gitOrFail(["branch", branch, "origin/main"], { stdio: "inherit" });
  gitOrFail(["push", "--force-with-lease", "origin", `refs/remotes/origin/main:refs/heads/${branch}`], {
    stdio: "inherit",
  });

  if (fs.existsSync(expectedWorktreePath)) {
    fs.rmSync(expectedWorktreePath, { recursive: true, force: true });
  }
  gitOrFail(["worktree", "add", expectedWorktreePath, branch], { stdio: "inherit" });

  fs.rmSync(metadataPath, { force: true });
  fs.rmSync(taskCardPath, { force: true });
}

console.log(`[reset-task] resetting task branches for ${taskSlug} from origin/main`);
gitOrFail(["fetch", "origin", "--prune"], { stdio: "inherit" });
for (const branch of branches) {
  resetBranch(branch);
}
git(["worktree", "prune"], { stdio: "inherit" });
console.log("[reset-task] completed");
