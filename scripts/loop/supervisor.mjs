#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { sleep, nowUtc, writeJson, ensureDir, log } from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LOOP_SCRIPT = path.join(__dirname, "codex-loop.mjs");
const BACKLOG_ENSURE_SCRIPT = path.join(REPO_ROOT, "scripts/worktree/ensure-backlog-item.mjs");
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const STATE_FILE = path.join(LOOP_DIR, "supervisor-state.json");
const LOG_FILE = path.join(LOOP_DIR, "runner.log");
const HEARTBEAT_FILE = path.join(LOOP_DIR, "heartbeat.json");
const ERR_LOG_FILE = path.join(LOOP_DIR, "runner.error.log");
const LOG_MAX_BYTES = Number(process.env.LOOP_LOG_MAX_BYTES || 10 * 1024 * 1024);
const LOG_KEEP_BYTES = Number(process.env.LOOP_LOG_KEEP_BYTES || 2 * 1024 * 1024);

const BASE_DELAY_SECONDS = Number(process.env.LOOP_SUPERVISOR_DELAY_BASE || 3);
const MAX_DELAY_SECONDS = Number(process.env.LOOP_SUPERVISOR_DELAY_MAX || 30);
const COMPLETE_DELAY_SECONDS = Number(process.env.LOOP_SUPERVISOR_COMPLETE_DELAY || 10);
const BACKOFF_JITTER_RATIO = Number(process.env.LOOP_SUPERVISOR_JITTER_RATIO || 0.2);
const MAX_RETRYABLE_FAILURES = Number(process.env.LOOP_SUPERVISOR_MAX_RETRYABLE_FAILURES || 8);
const SESSION_ID = process.env.LOOP_SESSION_ID || `${nowUtc().replace(/[:.]/g, "")}-${process.pid}`;
const SELF_HEAL_FAILURE_THRESHOLD = Number(process.env.LOOP_SELF_HEAL_FAILURE_THRESHOLD || 3);
const SELF_HEAL_COOLDOWN_SECONDS = Number(process.env.LOOP_SELF_HEAL_COOLDOWN_SECONDS || 30);

const EXIT_OK = 0;
const EXIT_COMPLETE = 10;
const EXIT_RETRYABLE_FAILURE = 20;
const EXIT_FATAL = 30;

function slog(level, message) {
  log("loop-supervisor", level, `[session=${SESSION_ID}] ${message}`);
}

function writeState(status, streak, delay, detail) {
  writeJson(STATE_FILE, {
    supervisor: "loop-supervisor",
    session: SESSION_ID,
    pid: process.pid,
    status,
    failureStreak: streak,
    nextDelaySeconds: delay,
    detail,
    updatedAt: nowUtc(),
  });
}

function computeBackoff(streak) {
  let delay = BASE_DELAY_SECONDS;
  for (let i = 1; i < streak; i += 1) {
    delay *= 2;
    if (delay >= MAX_DELAY_SECONDS) {
      delay = MAX_DELAY_SECONDS;
      break;
    }
  }
  const capped = Math.min(delay, MAX_DELAY_SECONDS);
  const ratio = Number.isFinite(BACKOFF_JITTER_RATIO) ? Math.max(0, BACKOFF_JITTER_RATIO) : 0;
  if (ratio === 0) return capped;
  const jitterSpan = Math.max(1, Math.floor(capped * ratio));
  const jitter = Math.floor(Math.random() * (jitterSpan * 2 + 1)) - jitterSpan;
  return Math.max(1, Math.min(MAX_DELAY_SECONDS, capped + jitter));
}

function tailFile(filePath, lineCount = 80) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return text.split(/\r?\n/).slice(-lineCount).join("\n");
  } catch {
    return "(unavailable)";
  }
}

function readJsonText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "(unavailable)";
  }
}

function trimLogFile(filePath, label) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (!Number.isFinite(LOG_MAX_BYTES) || !Number.isFinite(LOG_KEEP_BYTES)) return;
    if (LOG_MAX_BYTES <= 0 || LOG_KEEP_BYTES <= 0) return;
    if (stat.size <= LOG_MAX_BYTES) return;

    const keepBytes = Math.min(LOG_KEEP_BYTES, stat.size);
    const start = Math.max(0, stat.size - keepBytes);
    const fd = fs.openSync(filePath, "r+");
    try {
      const buffer = Buffer.alloc(keepBytes);
      const bytesRead = fs.readSync(fd, buffer, 0, keepBytes, start);
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, buffer, 0, bytesRead, 0);
    } finally {
      fs.closeSync(fd);
    }
    slog("warn", `${label} trimmed from ${stat.size} to ~${keepBytes} bytes`);
  } catch (error) {
    slog("error", `log trim failed for ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runNode(script, args, cwd = REPO_ROOT) {
  const child = spawn("node", [script, ...args], { cwd, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function runCodexSelfHeal(reason, failureStreak) {
  const prompt = [
    "You are operating in autonomous self-heal mode for this repository.",
    "A loop runtime anomaly happened. Fix only what is necessary to restore stable loop execution.",
    "Constraints:",
    "- Focus first on scripts under scripts/loop and their immediate integration points.",
    "- Do not revert unrelated user changes.",
    "- Run minimal validation for changed loop scripts.",
    "",
    `Anomaly reason: ${reason}`,
    `Failure streak: ${failureStreak}`,
    "",
    "Latest supervisor state JSON:",
    readJsonText(STATE_FILE),
    "",
    "Latest heartbeat JSON:",
    readJsonText(HEARTBEAT_FILE),
    "",
    "Tail of loop/runner.log:",
    tailFile(LOG_FILE, 120),
  ].join("\n");

  slog("warn", `self-heal triggered: ${reason}`);
  const child = spawn(
    "codex",
    ["exec", "--dangerously-bypass-approvals-and-sandbox", "-C", REPO_ROOT, prompt],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
  if (exitCode === 0) {
    slog("info", "self-heal completed successfully");
    return { attempted: true, success: true };
  }
  slog("error", `self-heal failed with exit=${exitCode}`);
  return { attempted: true, success: false };
}

async function main() {
  ensureDir(LOOP_DIR);

  let failureStreak = 0;
  let iteration = 1;
  let lastSelfHealAtMs = 0;

  while (true) {
    trimLogFile(LOG_FILE, "runner.log");
    trimLogFile(ERR_LOG_FILE, "runner.error.log");

    const startedAt = nowUtc();
    slog("info", `child start iteration=${iteration} at ${startedAt}`);
    writeState("running", failureStreak, 0, `iteration-${iteration}`);

    const childExit = await runNode(LOOP_SCRIPT, process.argv.slice(2));

    const endedAt = nowUtc();
    slog("info", `child exit=${childExit} at ${endedAt}`);

    if (childExit === EXIT_OK) {
      failureStreak = 0;
      writeState("idle", failureStreak, BASE_DELAY_SECONDS, "child-ok");
      await sleep(BASE_DELAY_SECONDS * 1000);
    } else if (childExit === EXIT_COMPLETE) {
      failureStreak = 0;
      writeState("handoff", failureStreak, COMPLETE_DELAY_SECONDS, "completion-token");
      const ensureExit = await runNode(BACKLOG_ENSURE_SCRIPT, []);
      if (ensureExit === 0) slog("info", "completion observed; backlog checked and loop will continue");
      else slog("error", "completion observed but backlog ensure failed");
      await sleep(COMPLETE_DELAY_SECONDS * 1000);
    } else if (childExit === EXIT_RETRYABLE_FAILURE) {
      failureStreak += 1;
      if (MAX_RETRYABLE_FAILURES > 0 && failureStreak > MAX_RETRYABLE_FAILURES) {
        writeState("fatal", failureStreak, 0, "retry-budget-exhausted");
        slog("error", `retry budget exhausted at streak=${failureStreak}; stopping supervisor`);
        process.exit(EXIT_FATAL);
      }
      const delay = computeBackoff(failureStreak);
      writeState("retrying", failureStreak, delay, "retryable-failure");
      slog("warn", `retryable failure streak=${failureStreak}; restart in ${delay}s`);

      const nowMs = Date.now();
      const selfHealAllowedByThreshold = failureStreak >= SELF_HEAL_FAILURE_THRESHOLD;
      const selfHealAllowedByCooldown = nowMs - lastSelfHealAtMs >= SELF_HEAL_COOLDOWN_SECONDS * 1000;
      if (selfHealAllowedByThreshold && selfHealAllowedByCooldown) {
        await runCodexSelfHeal(`retryable-failure-threshold-${failureStreak}`, failureStreak);
        lastSelfHealAtMs = Date.now();
      }

      await sleep(delay * 1000);
    } else if (childExit === EXIT_FATAL) {
      writeState("fatal", failureStreak, BASE_DELAY_SECONDS, "fatal-child-exit");
      slog("error", "fatal child exit detected");

      const nowMs = Date.now();
      const selfHealAllowedByCooldown = nowMs - lastSelfHealAtMs >= SELF_HEAL_COOLDOWN_SECONDS * 1000;
      if (selfHealAllowedByCooldown) {
        await runCodexSelfHeal("fatal-child-exit", failureStreak);
        lastSelfHealAtMs = Date.now();
      } else {
        slog("warn", "self-heal skipped due to cooldown");
      }
      slog("error", "stopping supervisor due to fatal classification");
      process.exit(EXIT_FATAL);
    } else {
      failureStreak += 1;
      if (MAX_RETRYABLE_FAILURES > 0 && failureStreak > MAX_RETRYABLE_FAILURES) {
        writeState("fatal", failureStreak, 0, "unknown-exit-retry-budget-exhausted");
        slog("error", `retry budget exhausted on unknown exits at streak=${failureStreak}; stopping supervisor`);
        process.exit(EXIT_FATAL);
      }
      const delay = computeBackoff(failureStreak);
      writeState("retrying", failureStreak, delay, `unknown-exit-${childExit}`);
      slog("warn", `unknown child exit=${childExit}; restart in ${delay}s`);
      await sleep(delay * 1000);
    }

    iteration += 1;
  }
}

main().catch((error) => {
  slog("error", `unexpected supervisor error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(EXIT_FATAL);
});
