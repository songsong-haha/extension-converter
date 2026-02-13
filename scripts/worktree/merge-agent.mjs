#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { branchExists, commandExists, fail, git, gitOrFail, run } from "./lib.mjs";

if (!commandExists("git")) fail("Error: git is required");

const [agentName, taskSlug, targetBranchArg] = process.argv.slice(2);
if (!agentName || !taskSlug) {
  console.error("Usage: node scripts/worktree/merge-agent.mjs <agent-name> <task-slug> [target-branch]");
  console.error("Example: node scripts/worktree/merge-agent.mjs growth hero-copy-a-b main");
  process.exit(1);
}

let targetBranch = targetBranchArg || "main";
const sourceBranch = `agent/${agentName}/${taskSlug}`;
const requiredBranches = [
  `agent/ceo/${taskSlug}`,
  `agent/growth/${taskSlug}`,
  `agent/qa/${taskSlug}`,
  `agent/analytics/${taskSlug}`,
  `agent/designer/${taskSlug}`,
];

if (targetBranch !== "main") {
  console.log(`[merge-gate] target branch policy enforced: requested '${targetBranch}' -> using 'main'`);
  targetBranch = "main";
}

if (!branchExists(sourceBranch)) fail(`Error: source branch not found: ${sourceBranch}`);
for (const b of requiredBranches) {
  if (!branchExists(b)) {
    console.error(`Error: mandatory core-team branch missing: ${b}`);
    console.error(`Create core-team worktrees first: npm run agent:task:start -- ${taskSlug} main`);
    process.exit(1);
  }
}

function gitIn(cwd, args, stdio = "inherit", env = undefined) {
  return run("git", ["-C", cwd, ...args], { stdio, env });
}

function gitInOrFail(cwd, args, stdio = "inherit", env = undefined) {
  const r = gitIn(cwd, args, stdio, env);
  if (r.status !== 0) fail(`Error: git command failed in ${cwd}: git -C ${cwd} ${args.join(" ")}`);
  return r;
}

function sanitizeRefPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 48) || "task";
}

function parseWorktreePorcelain(raw) {
  const blocks = raw.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const entries = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const entry = { path: "", branch: "" };
    for (const line of lines) {
      if (line.startsWith("worktree ")) entry.path = line.slice("worktree ".length).trim();
      if (line.startsWith("branch refs/heads/")) entry.branch = line.slice("branch refs/heads/".length).trim();
    }
    if (entry.path) entries.push(entry);
  }
  return entries;
}

function cleanupMergeGateWorktrees() {
  const listed = git(["worktree", "list", "--porcelain"], { stdio: "pipe" });
  if (listed.status !== 0) return;
  const entries = parseWorktreePorcelain(listed.stdout || "");
  for (const entry of entries) {
    const base = path.basename(entry.path);
    if (!base.startsWith("merge-gate-")) continue;
    git(["worktree", "remove", "--force", entry.path], { stdio: "ignore" });
    fs.rmSync(entry.path, { recursive: true, force: true });
  }
  git(["worktree", "prune"], { stdio: "ignore" });
}

function gitPath(cwd, refPath) {
  const r = gitIn(cwd, ["rev-parse", "--git-path", refPath], "pipe");
  if (r.status !== 0) return "";
  const p = r.stdout.trim();
  if (!p) return "";
  return path.isAbsolute(p) ? p : path.join(cwd, p);
}

function unresolvedFiles(cwd) {
  const r = gitIn(cwd, ["diff", "--name-only", "--diff-filter=U"], "pipe");
  if (r.status !== 0) return [];
  return r.stdout
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function rebaseInProgress(cwd) {
  const p1 = gitPath(cwd, "rebase-merge");
  const p2 = gitPath(cwd, "rebase-apply");
  return (p1 && fs.existsSync(p1)) || (p2 && fs.existsSync(p2));
}

function mergeInProgress(cwd) {
  const mergeHead = gitPath(cwd, "MERGE_HEAD");
  return !!(mergeHead && fs.existsSync(mergeHead));
}

function runCodexConflictResolver(cwd, mode, branchLabel, targetLabel) {
  const conflicts = unresolvedFiles(cwd);
  const prompt = [
    `Resolve git ${mode} conflicts in this repository and finish the ${mode} fully.`,
    `Source branch: ${branchLabel}`,
    `Target branch: ${targetLabel}`,
    conflicts.length > 0 ? `Conflicted files: ${conflicts.join(", ")}` : "Conflicted files: detect automatically.",
    "Rules:",
    "- Preserve behavior from both sides when compatible.",
    "- Keep fixes minimal and production-safe.",
    "- Do not delete unrelated files.",
    mode === "rebase"
      ? "- Run git add and git rebase --continue repeatedly until rebase finishes."
      : "- Run git add and finish merge commit with message: merge: conflict-resolved.",
    "- Exit with non-zero if you cannot resolve safely.",
  ].join("\n");

  const result = spawnSync(
    "codex",
    ["exec", "--dangerously-bypass-approvals-and-sandbox", "-C", cwd, prompt],
    { stdio: "inherit", encoding: "utf8" },
  );
  return result.status ?? 1;
}

function completeRebaseIfPossible(cwd) {
  for (let i = 0; i < 20 && rebaseInProgress(cwd); i += 1) {
    const conflicts = unresolvedFiles(cwd);
    if (conflicts.length > 0) return false;
    const res = gitIn(cwd, ["rebase", "--continue"], "inherit", { ...process.env, GIT_EDITOR: "true" });
    if (res.status !== 0) return false;
  }
  return !rebaseInProgress(cwd);
}

function completeMergeIfPossible(cwd) {
  if (!mergeInProgress(cwd)) return true;
  const conflicts = unresolvedFiles(cwd);
  if (conflicts.length > 0) return false;
  const commit = gitIn(cwd, ["commit", "-m", "merge: conflict-resolved"], "inherit", {
    ...process.env,
    GIT_EDITOR: "true",
  });
  return commit.status === 0 && !mergeInProgress(cwd);
}

console.log("[merge-gate] running mandatory QA gate before merge");
const qaGate = run("npm", ["run", "qa:gate"], { stdio: "inherit" });
if (qaGate.status !== 0) fail("Error: qa gate failed");

cleanupMergeGateWorktrees();

const tmpWorktree = fs.mkdtempSync(path.join(os.tmpdir(), `merge-gate-${taskSlug}.`));
const integrationBranch = `merge-int/${taskSlug}-${Date.now()}`;
const targetBranchLocal = `merge-target/${sanitizeRefPart(taskSlug)}-${Date.now()}`;
let addedWorktree = false;

try {
  console.log(`[merge-gate] preparing temporary merge worktree for target branch: ${targetBranch}`);
  gitOrFail(["worktree", "add", "--detach", tmpWorktree], { stdio: "inherit" });
  addedWorktree = true;

  gitInOrFail(tmpWorktree, ["fetch", "origin", "--prune"]);
  gitInOrFail(tmpWorktree, ["checkout", "-B", targetBranchLocal, `origin/${targetBranch}`]);

  console.log(`[merge-gate] creating integration branch from origin/${sourceBranch}`);
  gitInOrFail(tmpWorktree, ["checkout", "-B", integrationBranch, `origin/${sourceBranch}`]);

  console.log(`[merge-gate] attempting rebase: ${integrationBranch} onto ${targetBranch}`);
  const firstRebase = gitIn(tmpWorktree, ["rebase", targetBranch], "inherit", { ...process.env, GIT_EDITOR: "true" });

  if (firstRebase.status !== 0) {
    console.log("[merge-gate] rebase conflict detected; invoking codex resolver");
    const aiCode = runCodexConflictResolver(tmpWorktree, "rebase", sourceBranch, targetBranch);
    if (aiCode !== 0) fail("Error: codex conflict resolver failed during rebase");
    if (!completeRebaseIfPossible(tmpWorktree)) fail("Error: unresolved rebase conflict remains");
  }

  if (rebaseInProgress(tmpWorktree)) fail("Error: rebase still in progress after resolution");

  console.log(`[merge-gate] updating origin/${sourceBranch} with rebased head`);
  gitInOrFail(tmpWorktree, ["push", "--force-with-lease", "origin", `${integrationBranch}:${sourceBranch}`]);

  gitInOrFail(tmpWorktree, ["checkout", targetBranchLocal]);
  console.log(`[merge-gate] merging ${sourceBranch} into ${targetBranch}`);
  const mergeResult = gitIn(tmpWorktree, ["merge", "--no-ff", sourceBranch, "-m", `merge: ${sourceBranch}`], "inherit", {
    ...process.env,
    GIT_EDITOR: "true",
  });

  if (mergeResult.status !== 0) {
    console.log("[merge-gate] merge conflict detected; invoking codex resolver");
    const aiCode = runCodexConflictResolver(tmpWorktree, "merge", sourceBranch, targetBranch);
    if (aiCode !== 0) fail("Error: codex conflict resolver failed during merge");
    if (!completeMergeIfPossible(tmpWorktree)) fail("Error: unresolved merge conflict remains");
  }

  if (mergeInProgress(tmpWorktree)) fail("Error: merge still in progress after resolution");
  if (unresolvedFiles(tmpWorktree).length > 0) fail("Error: unresolved conflict files remain");

  console.log(`[merge-gate] pushing merged target branch: ${targetBranch}`);
  gitInOrFail(tmpWorktree, ["push", "origin", `HEAD:${targetBranch}`]);

  console.log("[merge-gate] merged successfully.");
  console.log("[merge-gate] core-team branches retained for follow-up verification:");
  for (const b of requiredBranches) console.log(`- ${b}`);
} finally {
  if (addedWorktree) git(["worktree", "remove", "--force", tmpWorktree], { stdio: "ignore" });
  fs.rmSync(tmpWorktree, { recursive: true, force: true });
  cleanupMergeGateWorktrees();
}
