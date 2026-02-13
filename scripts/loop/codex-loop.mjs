#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  sleep,
  nowUtc,
  log,
  readJsonSafe,
  writeJson,
  ensureDir,
  stripBranchFolder,
  readText,
  writeText,
} from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const PROMPT_FILE = path.join(LOOP_DIR, "prompt.md");
const PRD_FILE = path.join(LOOP_DIR, "prd.json");
const PRD_EXAMPLE_FILE = path.join(LOOP_DIR, "prd.json.example");
const PROGRESS_FILE = path.join(LOOP_DIR, "progress.txt");
const ARCHIVE_DIR = path.join(LOOP_DIR, "archive");
const LAST_BRANCH_FILE = path.join(LOOP_DIR, ".last-branch");
const BACKLOG_ENSURE_SCRIPT = path.join(REPO_ROOT, "scripts/worktree/ensure-backlog-item.mjs");
const PRD_SEED_SCRIPT = path.join(REPO_ROOT, "scripts/worktree/seed-prd-from-backlog.mjs");
const HEARTBEAT_FILE = path.join(LOOP_DIR, "heartbeat.json");
const LOCK_DIR = path.join(LOOP_DIR, ".runner.lock");
const LOCK_PID_FILE = path.join(LOCK_DIR, "pid");
const HEARTBEAT_INTERVAL_SECONDS = Number(process.env.LOOP_HEARTBEAT_INTERVAL_SECONDS || 10);
const CODEX_STALL_TIMEOUT_SECONDS = Number(process.env.LOOP_CODEX_STALL_TIMEOUT_SECONDS || 1800);
const CODEX_KILL_GRACE_MS = Number(process.env.LOOP_CODEX_KILL_GRACE_MS || 5000);

const EXIT_OK = 0;
const EXIT_COMPLETE = 10;
const EXIT_RETRYABLE_FAILURE = 20;
const EXIT_FATAL = 30;

function usage() {
  console.log(`Usage:
  node scripts/loop/codex-loop.mjs [options]

Options:
  --max-iterations <n>       0 means infinite (default: 0)
  --sleep-seconds <n>        seconds between iterations (default: 3)
  --model <name>             codex model override (optional)
  --completion-token <t>     loop stops if output includes this token
  --auto-promote             if PRD branch is agent/growth/<task>, run auto-promote flow
  --failure-backoff-base <n> base seconds for failure backoff (default: 5)
  --failure-backoff-max <n>  max seconds for failure backoff (default: 60)
  --fatal-stop <0|1>         if 1, stop on first retryable failure (default: 0)
  -h, --help                 show help`);
}

function parseArgs(argv) {
  const opts = {
    maxIterations: 0,
    sleepSeconds: 3,
    model: process.env.CODEX_MODEL || "",
    completionToken: process.env.LOOP_COMPLETION_TOKEN || "<promise>COMPLETE</promise>",
    autoPromote: false,
    failureBackoffBase: 5,
    failureBackoffMax: 60,
    fatalStop: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--max-iterations") opts.maxIterations = Number(argv[++i]);
    else if (arg === "--sleep-seconds") opts.sleepSeconds = Number(argv[++i]);
    else if (arg === "--model") opts.model = String(argv[++i] || "");
    else if (arg === "--completion-token") opts.completionToken = String(argv[++i] || "");
    else if (arg === "--auto-promote") opts.autoPromote = true;
    else if (arg === "--failure-backoff-base") opts.failureBackoffBase = Number(argv[++i]);
    else if (arg === "--failure-backoff-max") opts.failureBackoffMax = Number(argv[++i]);
    else if (arg === "--fatal-stop") opts.fatalStop = Number(argv[++i]);
    else if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(EXIT_OK);
    } else {
      log("loop", "error", `unknown option: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  const ints = [
    ["maxIterations", opts.maxIterations],
    ["sleepSeconds", opts.sleepSeconds],
    ["failureBackoffBase", opts.failureBackoffBase],
    ["failureBackoffMax", opts.failureBackoffMax],
  ];
  for (const [name, value] of ints) {
    if (!Number.isInteger(value) || value < 0) {
      log("loop", "error", `${name} must be a non-negative integer`);
      process.exit(1);
    }
  }
  if (opts.fatalStop !== 0 && opts.fatalStop !== 1) {
    log("loop", "error", "fatalStop must be 0 or 1");
    process.exit(1);
  }

  return opts;
}

function acquireLock() {
  try {
    fs.mkdirSync(LOCK_DIR);
    fs.writeFileSync(LOCK_PID_FILE, String(process.pid), "utf8");
    return true;
  } catch {
    const stalePid = readText(LOCK_PID_FILE, "").trim();
    if (stalePid) {
      try {
        process.kill(Number(stalePid), 0);
        return false;
      } catch {
        try {
          fs.rmSync(LOCK_DIR, { recursive: true, force: true });
          fs.mkdirSync(LOCK_DIR);
          fs.writeFileSync(LOCK_PID_FILE, String(process.pid), "utf8");
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }
}

function releaseLock() {
  try {
    fs.rmSync(LOCK_DIR, { recursive: true, force: true });
  } catch {
    // no-op
  }
}

function writeHeartbeat(status, iteration, failures, detail) {
  writeJson(HEARTBEAT_FILE, {
    runner: "codex-loop",
    pid: process.pid,
    status,
    iteration,
    consecutiveFailures: failures,
    detail,
    updatedAt: nowUtc(),
  });
}

function ensureLoopFiles() {
  ensureDir(LOOP_DIR);
  ensureDir(ARCHIVE_DIR);

  if (!fs.existsSync(PRD_FILE)) {
    if (fs.existsSync(PRD_EXAMPLE_FILE)) {
      fs.copyFileSync(PRD_EXAMPLE_FILE, PRD_FILE);
      log("loop", "info", `initialized ${PRD_FILE} from example`);
    } else {
      log("loop", "error", `missing ${PRD_FILE} and ${PRD_EXAMPLE_FILE}`);
      return false;
    }
  }

  if (!fs.existsSync(PROMPT_FILE)) {
    log("loop", "error", `missing ${PROMPT_FILE}`);
    return false;
  }

  if (!fs.existsSync(PROGRESS_FILE)) {
    writeText(
      PROGRESS_FILE,
      `# Loop Progress Log\n\n## Codebase Patterns\n- Run \`pnpm qa:gate\` before merge when behavior changed.\n\n---\nStarted: ${nowUtc()}\n`,
    );
  }

  return true;
}

function getPrdBranchName() {
  const prd = readJsonSafe(PRD_FILE, {});
  return typeof prd?.branchName === "string" ? prd.branchName : "";
}

function markPrdStoriesPassed() {
  const prd = readJsonSafe(PRD_FILE, {});
  if (!Array.isArray(prd?.userStories) || prd.userStories.length === 0) return;

  let changed = false;
  const updatedStories = prd.userStories.map((story) => {
    if (!story || typeof story !== "object") return story;
    if (story.passes === true) return story;
    changed = true;
    return {
      ...story,
      passes: true,
      notes: story.notes
        ? `${story.notes}; completed_at=${nowUtc()}`
        : `completed_at=${nowUtc()}`,
    };
  });

  if (!changed) return;
  writeJson(PRD_FILE, {
    ...prd,
    userStories: updatedStories,
  });
  log("loop", "info", "marked PRD stories as passed after completion");
}

function archiveIfBranchChanged() {
  const currentBranch = getPrdBranchName();
  const lastBranch = readText(LAST_BRANCH_FILE, "");

  if (currentBranch && lastBranch && currentBranch !== lastBranch) {
    const dateStamp = nowUtc().slice(0, 10);
    const folderName = stripBranchFolder(lastBranch);
    const target = path.join(ARCHIVE_DIR, `${dateStamp}-${folderName}`);
    ensureDir(target);
    if (fs.existsSync(PRD_FILE)) fs.copyFileSync(PRD_FILE, path.join(target, "prd.json"));
    if (fs.existsSync(PROGRESS_FILE)) fs.copyFileSync(PROGRESS_FILE, path.join(target, "progress.txt"));

    writeText(
      PROGRESS_FILE,
      `# Loop Progress Log\n\n## Codebase Patterns\n- Carry forward only reusable patterns, not raw logs.\n\n---\nStarted: ${nowUtc()}\n`,
    );
    log("loop", "info", `archived previous run to ${target}`);
  }

  if (currentBranch) writeText(LAST_BRANCH_FILE, currentBranch);
}

async function ensureBacklogItem() {
  if (!fs.existsSync(BACKLOG_ENSURE_SCRIPT)) {
    log("loop", "error", `missing backlog ensure script: ${BACKLOG_ENSURE_SCRIPT}`);
    return false;
  }

  const { code } = await runProcess("node", [BACKLOG_ENSURE_SCRIPT], { stdio: "inherit" });
  if (code !== 0) {
    log("loop", "error", "backlog ensure failed");
    return false;
  }
  return true;
}

async function ensurePrdSeededFromBacklog() {
  if (!fs.existsSync(PRD_SEED_SCRIPT)) {
    log("loop", "error", `missing prd seed script: ${PRD_SEED_SCRIPT}`);
    return false;
  }

  const { code } = await runProcess("node", [PRD_SEED_SCRIPT], { stdio: "inherit" });
  if (code !== 0) {
    log("loop", "error", "prd seed step failed");
    return false;
  }
  return true;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}

async function runIteration(iteration, opts, failureStreak) {
  const prompt = readText(PROMPT_FILE, "");
  const args = ["exec", "--dangerously-bypass-approvals-and-sandbox", "-C", REPO_ROOT];
  if (opts.model) args.push("--model", opts.model);
  args.push(prompt);

  console.log("\n===============================================================");
  if (opts.maxIterations === 0) console.log(`  Loop Iteration ${iteration} (infinite)`);
  else console.log(`  Loop Iteration ${iteration} of ${opts.maxIterations}`);
  console.log("===============================================================");

  const outputFile = path.join(os.tmpdir(), `codex-loop-${process.pid}-${Date.now()}.log`);
  const out = fs.openSync(outputFile, "w");

  const child = spawn("codex", args, { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let lastOutputAt = Date.now();
  let killedForStall = false;
  let stallKillTimer = null;
  const heartbeatTimer = setInterval(() => {
    writeHeartbeat("running", iteration, failureStreak, "codex-running");
    if (CODEX_STALL_TIMEOUT_SECONDS > 0) {
      const idleMs = Date.now() - lastOutputAt;
      if (idleMs > CODEX_STALL_TIMEOUT_SECONDS * 1000 && !killedForStall) {
        killedForStall = true;
        log("loop", "error", `codex appears stalled (no output for ${Math.floor(idleMs / 1000)}s), terminating`);
        try {
          child.kill("SIGTERM");
        } catch {
          // no-op
        }
        stallKillTimer = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // no-op
          }
        }, CODEX_KILL_GRACE_MS);
      }
    }
  }, Math.max(1, HEARTBEAT_INTERVAL_SECONDS) * 1000);

  child.stdout.on("data", (d) => {
    lastOutputAt = Date.now();
    process.stdout.write(d);
    fs.writeSync(out, d);
  });
  child.stderr.on("data", (d) => {
    lastOutputAt = Date.now();
    process.stderr.write(d);
    fs.writeSync(out, d);
  });

  const result = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1 }));
  });
  clearInterval(heartbeatTimer);
  if (stallKillTimer) clearTimeout(stallKillTimer);
  fs.closeSync(out);

  const tail = readText(outputFile, "").split(/\r?\n/).slice(-120);
  fs.rmSync(outputFile, { force: true });

  if (opts.completionToken && tail.includes(opts.completionToken)) {
    log("loop", "info", "completion token found");
    return EXIT_COMPLETE;
  }

  if (killedForStall) {
    log("loop", "warn", "stalled codex process was killed; treating as retryable failure");
    return EXIT_RETRYABLE_FAILURE;
  }

  if (result.code !== 0) {
    log("loop", "warn", `codex returned non-zero exit code: ${result.code}`);
    return EXIT_RETRYABLE_FAILURE;
  }

  return EXIT_OK;
}

function computeFailureBackoff(failures, opts) {
  let delay = opts.failureBackoffBase;
  for (let i = 1; i < failures; i += 1) {
    delay *= 2;
    if (delay >= opts.failureBackoffMax) {
      delay = opts.failureBackoffMax;
      break;
    }
  }
  return Math.min(delay, opts.failureBackoffMax);
}

async function maybeAutoPromote(opts) {
  if (!opts.autoPromote) return EXIT_OK;
  const currentBranch = getPrdBranchName();
  const match = currentBranch.match(/^agent\/growth\/(.+)$/);
  if (!match) {
    log("loop", "error", `auto-promote requires branch format agent/growth/<task>. current: ${currentBranch}`);
    return EXIT_RETRYABLE_FAILURE;
  }

  const taskSlug = match[1];
  log("loop", "info", `auto-promote enabled. task=${taskSlug}`);
  const script = path.join(REPO_ROOT, "scripts/worktree/auto-promote.mjs");
  const { code } = await runProcess("node", [script, "growth", taskSlug, "main"], { cwd: REPO_ROOT, stdio: "inherit" });
  if (code !== 0) {
    log("loop", "error", "auto-promote failed");
    return EXIT_RETRYABLE_FAILURE;
  }
  return EXIT_OK;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!acquireLock()) {
    writeHeartbeat("fatal", 0, 0, "lock-unavailable");
    process.exit(EXIT_FATAL);
  }

  process.on("exit", releaseLock);
  process.on("SIGINT", () => process.exit(130));
  process.on("SIGTERM", () => process.exit(143));

  writeHeartbeat("starting", 0, 0, "boot");

  if (!ensureLoopFiles()) {
    writeHeartbeat("fatal", 0, 0, "ensure-loop-files-failed");
    process.exit(EXIT_FATAL);
  }

  archiveIfBranchChanged();

  let i = 1;
  let failureStreak = 0;

  while (true) {
    writeHeartbeat("running", i, failureStreak, "ensure-backlog");
    if (!(await ensureBacklogItem())) {
      writeHeartbeat("fatal", i, failureStreak, "backlog-ensure-failed");
      process.exit(EXIT_FATAL);
    }
    if (!(await ensurePrdSeededFromBacklog())) {
      writeHeartbeat("fatal", i, failureStreak, "prd-seed-failed");
      process.exit(EXIT_FATAL);
    }

    const result = await runIteration(i, opts, failureStreak);

    if (result === EXIT_COMPLETE) {
      writeHeartbeat("complete", i, failureStreak, "completion-token");
      const promoteResult = await maybeAutoPromote(opts);
      if (promoteResult === EXIT_RETRYABLE_FAILURE) {
        failureStreak += 1;
        writeHeartbeat("retrying", i, failureStreak, "auto-promote-failed");
        const delay = computeFailureBackoff(failureStreak, opts);
        log("loop", "warn", `auto-promote failure streak=${failureStreak}; sleeping ${delay}s`);
        await sleep(delay * 1000);
        continue;
      }
      markPrdStoriesPassed();
      process.exit(EXIT_COMPLETE);
    }

    if (result === EXIT_RETRYABLE_FAILURE) {
      failureStreak += 1;
      writeHeartbeat("retrying", i, failureStreak, "codex-exit-nonzero");
      if (opts.fatalStop === 1) {
        log("loop", "error", "fatal-stop enabled; halting after retryable failure");
        writeHeartbeat("fatal", i, failureStreak, "fatal-stop-enabled");
        process.exit(EXIT_FATAL);
      }
      const delay = computeFailureBackoff(failureStreak, opts);
      log("loop", "warn", `retryable failure streak=${failureStreak}; sleeping ${delay}s`);
      await sleep(delay * 1000);
      continue;
    }

    if (opts.maxIterations > 0 && i >= opts.maxIterations) {
      writeHeartbeat("idle", i, failureStreak, "max-iterations-reached");
      log("loop", "info", `reached max iterations: ${opts.maxIterations}`);
      process.exit(EXIT_OK);
    }

    failureStreak = 0;
    writeHeartbeat("running", i, failureStreak, "sleep");
    i += 1;
    await sleep(opts.sleepSeconds * 1000);
  }
}

main().catch((error) => {
  log("loop", "error", `unexpected error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(EXIT_FATAL);
});
