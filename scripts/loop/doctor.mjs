#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const PACKAGE_JSON = path.join(REPO_ROOT, "package.json");
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const HEARTBEAT_FILE = path.join(LOOP_DIR, "heartbeat.json");

const errors = [];
const warnings = [];

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: "utf8" });
}

function exists(p) {
  return fs.existsSync(path.join(REPO_ROOT, p));
}

function isTracked(relPath) {
  const result = run("git", ["ls-files", "--error-unmatch", relPath]);
  return result.status === 0;
}

function checkScriptTargets() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8"));
  const scripts = pkg.scripts || {};
  for (const [name, command] of Object.entries(scripts)) {
    const normalized = String(command || "").trim();
    const match = normalized.match(/(?:^|\s)(?:node|bash)\s+(scripts\/[^\s]+)/);
    if (!match) continue;
    const scriptPath = match[1];
    if (!exists(scriptPath)) {
      errors.push(`missing script target: scripts.${name} -> ${scriptPath}`);
    }
  }
}

function checkLoopPrerequisites() {
  const required = [
    "scripts/loop/codex-loop.mjs",
    "scripts/loop/supervisor.mjs",
    "scripts/loop/start-bg.mjs",
    "scripts/worktree/auto-promote.mjs",
    "loop/prompt.md",
    "loop/policy.json",
  ];

  for (const rel of required) {
    if (!exists(rel)) errors.push(`missing required file: ${rel}`);
  }

  for (const rel of required) {
    if (exists(rel) && !isTracked(rel)) {
      errors.push(`runtime file must be git-tracked: ${rel}`);
    }
  }
}

function checkEntryPointLoad() {
  const checks = [
    { rel: "scripts/loop/codex-loop.mjs", args: ["--help"], expectStatuses: [0] },
    { rel: "scripts/worktree/auto-promote.mjs", args: [], expectStatuses: [30] },
  ];
  for (const check of checks) {
    if (!exists(check.rel)) continue;
    const result = run("node", [check.rel, ...check.args]);
    if (!check.expectStatuses.includes(result.status ?? 1)) {
      errors.push(`entrypoint load check failed: ${check.rel} (exit=${result.status ?? 1})`);
    }
  }
}

function checkGitAndWorktree() {
  const git = run("git", ["rev-parse", "--is-inside-work-tree"]);
  if (git.status !== 0 || !(git.stdout || "").trim().includes("true")) {
    errors.push("git worktree check failed");
  }

  const wt = run("git", ["worktree", "list", "--porcelain"]);
  if (wt.status !== 0) {
    warnings.push("unable to list git worktrees (cleanup checks skipped)");
  }
}

function checkCommands() {
  for (const cmd of ["git", "node", "npm", "codex"]) {
    const which = run("bash", ["-lc", `command -v ${cmd}`]);
    if (which.status !== 0) errors.push(`required command not found: ${cmd}`);
  }
}

function checkMacOsPathRisk() {
  if (process.platform !== "darwin") return;
  const protectedRoots = [
    path.join(os.homedir(), "Desktop"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Downloads"),
  ];
  for (const root of protectedRoots) {
    if (REPO_ROOT.startsWith(root)) {
      warnings.push(`repo is under protected macOS path: ${root} (launchd may need extra privacy grants)`);
      break;
    }
  }
}

function checkHeartbeatWrite() {
  try {
    fs.mkdirSync(LOOP_DIR, { recursive: true });
    fs.writeFileSync(HEARTBEAT_FILE, `${JSON.stringify({ doctor: true, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
  } catch {
    errors.push("unable to write loop heartbeat file");
  }
}

function main() {
  checkScriptTargets();
  checkLoopPrerequisites();
  checkEntryPointLoad();
  checkCommands();
  checkGitAndWorktree();
  checkMacOsPathRisk();
  checkHeartbeatWrite();

  console.log("[loop-doctor] summary");
  if (errors.length === 0) console.log("- errors: none");
  else for (const error of errors) console.log(`- error: ${error}`);

  if (warnings.length === 0) console.log("- warnings: none");
  else for (const warning of warnings) console.log(`- warning: ${warning}`);

  process.exit(errors.length === 0 ? 0 : 1);
}

main();
