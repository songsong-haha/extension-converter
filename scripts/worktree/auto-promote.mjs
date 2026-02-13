#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { branchExists, commandExists, fail, git, gitOrFail, repoRootOrFail, run } from "./lib.mjs";

if (!commandExists("git")) fail("Error: git is required");

const [agentName, taskSlug, targetBranchArg] = process.argv.slice(2);
if (!agentName || !taskSlug) {
  console.error("Usage: node scripts/worktree/auto-promote.mjs <agent-name> <task-slug> [target-branch]");
  console.error("Example: node scripts/worktree/auto-promote.mjs growth hero-copy-a-b main");
  process.exit(1);
}

let targetBranch = targetBranchArg || "main";
const sourceBranch = `agent/${agentName}/${taskSlug}`;
const ceoBranch = `agent/ceo/${taskSlug}`;
const growthBranch = `agent/growth/${taskSlug}`;
const qaBranch = `agent/qa/${taskSlug}`;
const analyticsBranch = `agent/analytics/${taskSlug}`;
const designerBranch = `agent/designer/${taskSlug}`;
const allCoreBranches = [ceoBranch, growthBranch, qaBranch, analyticsBranch, designerBranch];

if (targetBranch !== "main") {
  console.log(`[auto-promote] target branch policy enforced: requested '${targetBranch}' -> using 'main'`);
  targetBranch = "main";
}

if (!branchExists(sourceBranch)) fail(`Error: source branch not found: ${sourceBranch}`);
for (const b of allCoreBranches) {
  if (!branchExists(b)) fail(`Error: mandatory core-team branch not found: ${b}`);
}

console.log("[auto-promote] pushing core-team branches");
for (const b of allCoreBranches) gitOrFail(["push", "-u", "origin", b], { stdio: "inherit" });

console.log("[auto-promote] running merge gate");
const mergeScript = path.join(repoRootOrFail(), "scripts/worktree/merge-agent.mjs");
const mergeRun = run("node", [mergeScript, agentName, taskSlug, targetBranch], { stdio: "inherit" });
if (mergeRun.status !== 0) fail("Error: merge gate failed");

console.log("[auto-promote] removing local worktrees and local branches");
const repoRoot = repoRootOrFail();

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

function removeAgentArtifacts(agent) {
  const branch = `agent/${agent}/${taskSlug}`;
  const expectedWorktreePath = path.join(repoRoot, ".worktrees", `${agent}-${taskSlug}`);
  const checkedOutPath = checkedOutWorktreePath(branch);

  const worktreeCandidates = [];
  if (checkedOutPath && fs.existsSync(checkedOutPath)) worktreeCandidates.push(checkedOutPath);
  if (fs.existsSync(expectedWorktreePath) && !worktreeCandidates.includes(expectedWorktreePath)) {
    worktreeCandidates.push(expectedWorktreePath);
  }

  if (worktreeCandidates.length === 0) {
    console.log(`[auto-promote] worktree already absent for ${agent}-${taskSlug}; skipping worktree removal`);
  } else {
    for (const wtPath of worktreeCandidates) {
      console.log(`[auto-promote] removing worktree for ${branch}: ${wtPath}`);
      const rm = git(["worktree", "remove", "--force", wtPath], { stdio: "inherit" });
      if (rm.status !== 0) {
        console.log(`[auto-promote] warning: failed to remove worktree for ${branch} at ${wtPath}`);
      }
    }
  }

  const stillCheckedOutPath = checkedOutWorktreePath(branch);
  if (stillCheckedOutPath) {
    console.log(`[auto-promote] branch still checked out at ${stillCheckedOutPath}; skipping local branch delete: ${branch}`);
    return;
  }

  if (branchExists(branch)) {
    const del = git(["branch", "-D", branch], { stdio: "inherit" });
    if (del.status === 0) {
      console.log(`[auto-promote] deleted local branch: ${branch}`);
    } else {
      console.log(`[auto-promote] warning: could not delete local branch ${branch}; continuing`);
    }
  }
}

removeAgentArtifacts(agentName);
for (const agent of ["ceo", "growth", "qa", "analytics", "designer"]) {
  if (agent !== agentName) removeAgentArtifacts(agent);
}

console.log("[auto-promote] removing remote agent branches (non-blocking)");
const deleteRefs = new Set([sourceBranch, ...allCoreBranches]);
const deleteArgs = Array.from(deleteRefs).map((ref) => `:${ref}`);
const remoteDelete = git(["push", "origin", ...deleteArgs], { stdio: "inherit" });
if (remoteDelete.status !== 0) {
  console.log("[auto-promote] warning: remote branch deletion skipped/failed. delete manually if needed.");
}

console.log(`[auto-promote] completed for task: ${taskSlug}`);
