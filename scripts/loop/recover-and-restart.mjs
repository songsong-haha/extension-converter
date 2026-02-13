#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { repoRootOrFail, run } from "../worktree/lib.mjs";

const REPO_ROOT = repoRootOrFail();
const LOOP_DIR = path.join(REPO_ROOT, "loop");

function execOk(cmd, args, cwd = REPO_ROOT) {
  const result = run(cmd, args, { cwd, stdio: "inherit" });
  return result.status === 0;
}

function execIgnore(cmd, args, cwd = REPO_ROOT) {
  run(cmd, args, { cwd, stdio: "ignore" });
}

function listWorktreePaths() {
  const listed = run("git", ["worktree", "list", "--porcelain"], { cwd: REPO_ROOT, stdio: "pipe" });
  if (listed.status !== 0) return [];
  return (listed.stdout || "")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length).trim())
    .filter(Boolean);
}

function stopLoopProcesses() {
  execIgnore("npm", ["run", "-s", "loop:bg:stop"]);

  const monitorPidFile = path.join(LOOP_DIR, "monitor.pid");
  if (fs.existsSync(monitorPidFile)) {
    const pid = fs.readFileSync(monitorPidFile, "utf8").trim();
    if (pid) execIgnore("kill", [pid]);
  }

  execIgnore("pkill", ["-f", "scripts/loop/supervisor.mjs"]);
  execIgnore("pkill", ["-f", "scripts/loop/codex-loop.mjs"]);
  execIgnore("pkill", ["-f", "scripts/loop/monitor-loop.mjs"]);
}

function cleanupWorktrees() {
  const paths = listWorktreePaths();
  for (const wtPath of paths) {
    if (wtPath.startsWith(path.join(REPO_ROOT, ".worktrees")) || wtPath.includes(`${path.sep}merge-gate-`)) {
      execIgnore("git", ["worktree", "remove", "--force", wtPath]);
      fs.rmSync(wtPath, { recursive: true, force: true });
    }
  }
  execIgnore("git", ["worktree", "prune"]);
}

function cleanupTemporaryBranches() {
  const listed = run("git", ["branch", "--list", "__merge_target__", "merge-int/*", "merge-target/*"], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  if (listed.status !== 0) return;
  const branches = (listed.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[*+ ]+\s*/, "").trim())
    .filter(Boolean);
  for (const b of branches) execIgnore("git", ["branch", "-D", b]);
}

function hardResetToOriginMain() {
  if (!execOk("git", ["fetch", "origin", "--prune"])) return false;
  if (!execOk("git", ["reset", "--hard", "origin/main"])) return false;
  if (!execOk("git", ["clean", "-fd"])) return false;
  return true;
}

function cleanupPidFiles() {
  const files = [
    path.join(LOOP_DIR, "loop-bg.pid"),
    path.join(LOOP_DIR, "monitor.pid"),
    path.join(LOOP_DIR, "runner.pid"),
    path.join(LOOP_DIR, ".runner.lock", "pid"),
  ];
  for (const file of files) fs.rmSync(file, { force: true });
}

function main() {
  console.log("[loop-recover] stopping loop/monitor processes");
  stopLoopProcesses();

  console.log("[loop-recover] removing temporary and agent worktrees");
  cleanupWorktrees();

  console.log("[loop-recover] deleting temporary merge branches");
  cleanupTemporaryBranches();

  console.log("[loop-recover] resetting repository to origin/main");
  const resetOk = hardResetToOriginMain();
  if (!resetOk) {
    console.error("[loop-recover] failed during git reset/clean");
    process.exit(1);
  }

  cleanupPidFiles();

  console.log("[loop-recover] restarting loop background runner");
  if (!execOk("npm", ["run", "-s", "loop:bg:start:auto-promote"])) {
    console.error("[loop-recover] failed to restart loop");
    process.exit(1);
  }

  console.log("[loop-recover] done");
}

main();
