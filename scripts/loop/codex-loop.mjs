#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
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
const AUTO_PROMOTE_SCRIPT = path.join(REPO_ROOT, "scripts/worktree/auto-promote.mjs");
const POLICY_FILE = path.join(LOOP_DIR, "policy.json");
const HEARTBEAT_FILE = path.join(LOOP_DIR, "heartbeat.json");
const LOCK_DIR = path.join(LOOP_DIR, ".runner.lock");
const LOCK_PID_FILE = path.join(LOCK_DIR, "pid");
const PROMOTION_CONTROLLER_FILE = path.join(LOOP_DIR, "promotion-controller.json");
const HEARTBEAT_INTERVAL_SECONDS = Number(process.env.LOOP_HEARTBEAT_INTERVAL_SECONDS || 10);
const CODEX_STALL_TIMEOUT_SECONDS = Number(process.env.LOOP_CODEX_STALL_TIMEOUT_SECONDS || 1800);
const CODEX_KILL_GRACE_MS = Number(process.env.LOOP_CODEX_KILL_GRACE_MS || 5000);
const PROMOTION_BREAKER_THRESHOLD = Number(process.env.LOOP_PROMOTE_BREAKER_THRESHOLD || 3);
const PROMOTION_BREAKER_OPEN_SECONDS = Number(process.env.LOOP_PROMOTE_BREAKER_OPEN_SECONDS || 300);
const PROMOTION_POLICY_RETRY_MAX = Number(process.env.LOOP_PROMOTE_POLICY_RETRY_MAX || 2);
const PROMOTION_POLICY_RETRY_DELAY_SECONDS = Number(process.env.LOOP_PROMOTE_POLICY_RETRY_DELAY_SECONDS || 30);
const SESSION_ID = process.env.LOOP_SESSION_ID || `loop-${nowUtc().replace(/[:.]/g, "")}-${process.pid}`;

const EXIT_OK = 0;
const EXIT_COMPLETE = 10;
const EXIT_RETRYABLE_FAILURE = 20;
const EXIT_FATAL = 30;

function relRepo(p) {
  return path.relative(REPO_ROOT, p) || ".";
}

function isTrackedByGit(absPath) {
  const relPath = relRepo(absPath);
  const result = spawnSync("git", ["ls-files", "--error-unmatch", relPath], {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });
  return result.status === 0;
}

function usage() {
  console.log(`Usage:
  node scripts/loop/codex-loop.mjs [options]

Options:
  --model <name>             codex model override (optional)
  --completion-token <t>     loop stops if output includes this token
  --auto-promote             if PRD branch is agent/growth/<task>, run auto-promote flow
  --max-iterations <n>       accepted for compatibility (ignored)
  --sleep-seconds <n>        accepted for compatibility (ignored)
  --failure-backoff-base <n> accepted for compatibility (ignored)
  --failure-backoff-max <n>  accepted for compatibility (ignored)
  --fatal-stop <0|1>         accepted for compatibility (ignored)
  -h, --help                 show help`);
}

function parseArgs(argv) {
  const opts = {
    model: process.env.CODEX_MODEL || "",
    completionToken: process.env.LOOP_COMPLETION_TOKEN || "<promise>COMPLETE</promise>",
    autoPromote: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--model") opts.model = String(argv[++i] || "");
    else if (arg === "--completion-token") opts.completionToken = String(argv[++i] || "");
    else if (arg === "--auto-promote") opts.autoPromote = true;
    else if (
      arg === "--max-iterations" ||
      arg === "--sleep-seconds" ||
      arg === "--failure-backoff-base" ||
      arg === "--failure-backoff-max" ||
      arg === "--fatal-stop"
    ) {
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(EXIT_OK);
    } else {
      log("loop", "error", `unknown option: ${arg}`);
      usage();
      process.exit(EXIT_FATAL);
    }
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

function writeHeartbeat(status, detail, phase, extra = {}) {
  writeJson(HEARTBEAT_FILE, {
    runner: "codex-loop",
    session: SESSION_ID,
    pid: process.pid,
    status,
    phase,
    detail,
    updatedAt: nowUtc(),
    ...extra,
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

function validatePrdShape() {
  const parsed = readJsonSafe(PRD_FILE, null);
  if (!parsed || typeof parsed !== "object") {
    log("loop", "error", `invalid or malformed PRD JSON: ${PRD_FILE}`);
    return false;
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

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}

function runProcessWithOutput(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += String(d);
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
      process.stderr.write(d);
    });

    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code: code ?? 1, signal, stdout, stderr }));
  });
}

async function ensureBacklogItem() {
  if (!fs.existsSync(BACKLOG_ENSURE_SCRIPT)) {
    log("loop", "error", `missing backlog ensure script: ${BACKLOG_ENSURE_SCRIPT}`);
    return EXIT_FATAL;
  }

  const { code } = await runProcess("node", [BACKLOG_ENSURE_SCRIPT], { stdio: "inherit" });
  return code === 0 ? EXIT_OK : EXIT_FATAL;
}

async function ensurePrdSeededFromBacklog() {
  if (!fs.existsSync(PRD_SEED_SCRIPT)) {
    log("loop", "error", `missing prd seed script: ${PRD_SEED_SCRIPT}`);
    return EXIT_FATAL;
  }

  const { code } = await runProcess("node", [PRD_SEED_SCRIPT], { stdio: "inherit" });
  return code === 0 ? EXIT_OK : EXIT_FATAL;
}

async function runCodexIteration(opts) {
  const prompt = readText(PROMPT_FILE, "");
  const args = ["exec", "--dangerously-bypass-approvals-and-sandbox", "-C", REPO_ROOT];
  if (opts.model) args.push("--model", opts.model);
  args.push(prompt);

  const outputFile = path.join(os.tmpdir(), `codex-loop-${process.pid}-${Date.now()}.log`);
  const out = fs.openSync(outputFile, "w");

  const child = spawn("codex", args, { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let lastOutputAt = Date.now();
  let killedForStall = false;
  let stallKillTimer = null;

  const heartbeatTimer = setInterval(() => {
    writeHeartbeat("running", "codex-running", "run-codex", {
      lastOutputAt: new Date(lastOutputAt).toISOString(),
    });

    if (CODEX_STALL_TIMEOUT_SECONDS <= 0) return;
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

  const tailText = readText(outputFile, "").split(/\r?\n/).slice(-120).join("\n");
  fs.rmSync(outputFile, { force: true });

  if (opts.completionToken && tailText.includes(opts.completionToken)) {
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

function readPromotionController() {
  return readJsonSafe(PROMOTION_CONTROLLER_FILE, {
    state: "closed",
    consecutiveFailures: 0,
    openedAt: "",
    quarantineUntil: "",
    lastFailureClass: "",
    lastErrorSignature: "",
    lastTask: "",
    policyRetryCount: 0,
    lastFailureAt: "",
    nextRetryAt: "",
    updatedAt: "",
  });
}

function writePromotionController(nextState) {
  writeJson(PROMOTION_CONTROLLER_FILE, {
    ...readPromotionController(),
    ...nextState,
    updatedAt: nowUtc(),
  });
}

async function sleepMs(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function computeErrorSignature(text) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  return normalized || "unknown";
}

function classifyAutoPromoteFailure(exitCode, combinedOutput) {
  const out = String(combinedOutput || "");
  if (/ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find module/i.test(out)) return "config-fatal";
  if (/missing auto-promote script|missing required file|missing .* script/i.test(out)) return "config-fatal";
  if (/fatal: required branch not found|fatal: target branch not found/i.test(out)) return "policy-terminal";
  if (/fatal: worktree must be clean before merge|fatal: qa gate failed|fatal: merge failed/i.test(out)) return "policy-terminal";
  if (exitCode === EXIT_FATAL) return "policy-terminal";
  if (exitCode === EXIT_RETRYABLE_FAILURE) return "retryable";
  return "unknown";
}

function preflightAutoPromoteFiles() {
  const requiredFiles = [AUTO_PROMOTE_SCRIPT, POLICY_FILE];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      return {
        ok: false,
        reason: `missing required file: ${relRepo(file)}`,
      };
    }
    if (!isTrackedByGit(file)) {
      return {
        ok: false,
        reason: `runtime file must be git-tracked: ${relRepo(file)}`,
      };
    }
  }
  return { ok: true, reason: "" };
}

async function runAutoPromoteOnce(taskSlug) {
  const { code, stdout, stderr } = await runProcessWithOutput("node", [AUTO_PROMOTE_SCRIPT, "growth", taskSlug, "main"], {
    cwd: REPO_ROOT,
  });
  const combinedOutput = `${stdout || ""}\n${stderr || ""}`;
  const failureClass = classifyAutoPromoteFailure(code, combinedOutput);
  const signature = computeErrorSignature(combinedOutput);
  return {
    code,
    failureClass,
    signature,
  };
}

async function maybeAutoPromote(opts) {
  if (!opts.autoPromote) return EXIT_OK;

  const currentBranch = getPrdBranchName();
  const match = currentBranch.match(/^agent\/growth\/(.+)$/);
  if (!match) {
    log("loop", "error", `auto-promote requires branch format agent/growth/<task>. current: ${currentBranch}`);
    return EXIT_FATAL;
  }
  const taskSlug = match[1];
  let breaker = readPromotionController();
  const nowMs = Date.now();
  const quarantineUntilMs = breaker.quarantineUntil ? Date.parse(breaker.quarantineUntil) : NaN;

  if (breaker.state === "open" && Number.isFinite(quarantineUntilMs) && nowMs < quarantineUntilMs) {
    const retryAt = new Date(quarantineUntilMs).toISOString();
    log("loop", "warn", `auto-promote circuit is OPEN for task=${taskSlug} until ${retryAt}; skipping promote`);
    return EXIT_OK;
  }

  if (breaker.state === "open" && Number.isFinite(quarantineUntilMs) && nowMs >= quarantineUntilMs) {
    writePromotionController({
      state: "half-open",
      openedAt: "",
      quarantineUntil: "",
      policyRetryCount: 0,
      nextRetryAt: "",
      lastTask: taskSlug,
    });
    breaker = readPromotionController();
  }

  const preflight = preflightAutoPromoteFiles();
  if (!preflight.ok) {
    const signature = computeErrorSignature(preflight.reason);
    const until = new Date(Date.now() + Math.max(1, PROMOTION_BREAKER_OPEN_SECONDS) * 1000).toISOString();
    writePromotionController({
      state: "open",
      consecutiveFailures: Math.max(1, Number(breaker.consecutiveFailures || 0)),
      openedAt: nowUtc(),
      quarantineUntil: until,
      lastFailureClass: "config-fatal",
      lastErrorSignature: signature,
      lastTask: taskSlug,
      policyRetryCount: 0,
      lastFailureAt: nowUtc(),
      nextRetryAt: "",
    });
    log("loop", "error", `auto-promote preflight failed: ${preflight.reason}; breaker opened until ${until}`);
    return EXIT_FATAL;
  }

  log("loop", "info", `auto-promote enabled. task=${taskSlug}`);
  const maxPolicyRetries = Math.max(0, PROMOTION_POLICY_RETRY_MAX);
  const policyRetryDelaySeconds = Math.max(1, PROMOTION_POLICY_RETRY_DELAY_SECONDS);

  for (let attempt = 0; attempt <= maxPolicyRetries; attempt += 1) {
    const { code, failureClass, signature } = await runAutoPromoteOnce(taskSlug);
    if (code === EXIT_OK) {
      writePromotionController({
        state: "closed",
        consecutiveFailures: 0,
        openedAt: "",
        quarantineUntil: "",
        lastFailureClass: "",
        lastErrorSignature: "",
        lastTask: taskSlug,
        policyRetryCount: 0,
        lastFailureAt: "",
        nextRetryAt: "",
      });
      return EXIT_OK;
    }

    const nextFailures = Number(breaker.consecutiveFailures || 0) + 1;
    breaker = {
      ...breaker,
      consecutiveFailures: nextFailures,
    };

    if (failureClass === "policy-terminal" && attempt < maxPolicyRetries) {
      const retryCount = attempt + 1;
      const nextRetryAtIso = new Date(Date.now() + policyRetryDelaySeconds * 1000).toISOString();
      writePromotionController({
        state: "half-open",
        consecutiveFailures: nextFailures,
        openedAt: "",
        quarantineUntil: "",
        lastFailureClass: failureClass,
        lastErrorSignature: signature,
        lastTask: taskSlug,
        policyRetryCount: retryCount,
        lastFailureAt: nowUtc(),
        nextRetryAt: nextRetryAtIso,
      });
      log(
        "loop",
        "warn",
        `auto-promote failed (${failureClass}, exit=${code}); retry ${retryCount}/${maxPolicyRetries} in ${policyRetryDelaySeconds}s`,
      );
      await sleepMs(policyRetryDelaySeconds * 1000);
      continue;
    }

    const shouldOpen =
      failureClass === "config-fatal" ||
      failureClass === "policy-terminal" ||
      nextFailures >= Math.max(1, PROMOTION_BREAKER_THRESHOLD);

    if (shouldOpen) {
      const until = new Date(Date.now() + Math.max(1, PROMOTION_BREAKER_OPEN_SECONDS) * 1000).toISOString();
      writePromotionController({
        state: "open",
        consecutiveFailures: nextFailures,
        openedAt: nowUtc(),
        quarantineUntil: until,
        lastFailureClass: failureClass,
        lastErrorSignature: signature,
        lastTask: taskSlug,
        policyRetryCount: failureClass === "policy-terminal" ? maxPolicyRetries : 0,
        lastFailureAt: nowUtc(),
        nextRetryAt: "",
      });
      log("loop", "error", `auto-promote failed (${failureClass}, exit=${code}); breaker opened until ${until}`);
      return EXIT_FATAL;
    }

    writePromotionController({
      state: "closed",
      consecutiveFailures: nextFailures,
      lastFailureClass: failureClass,
      lastErrorSignature: signature,
      lastTask: taskSlug,
      policyRetryCount: 0,
      lastFailureAt: nowUtc(),
      nextRetryAt: "",
    });
    log("loop", "error", `auto-promote failed (${failureClass}, exit=${code}); retry allowed`);
    return EXIT_RETRYABLE_FAILURE;
  }

  return EXIT_FATAL;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!acquireLock()) {
    writeHeartbeat("fatal", "lock-unavailable", "boot");
    process.exit(EXIT_FATAL);
  }

  process.on("exit", releaseLock);
  process.on("SIGINT", () => process.exit(130));
  process.on("SIGTERM", () => process.exit(143));

  writeHeartbeat("starting", "boot", "boot");

  if (!ensureLoopFiles()) {
    writeHeartbeat("fatal", "ensure-loop-files-failed", "boot");
    process.exit(EXIT_FATAL);
  }
  if (!validatePrdShape()) {
    writeHeartbeat("fatal", "invalid-prd-json", "boot");
    process.exit(EXIT_FATAL);
  }

  archiveIfBranchChanged();

  writeHeartbeat("running", "ensure-backlog", "ensure-backlog");
  const backlogResult = await ensureBacklogItem();
  if (backlogResult !== EXIT_OK) {
    writeHeartbeat("fatal", "backlog-ensure-failed", "ensure-backlog");
    process.exit(backlogResult);
  }

  writeHeartbeat("running", "seed-prd", "seed-prd");
  const seedResult = await ensurePrdSeededFromBacklog();
  if (seedResult !== EXIT_OK) {
    writeHeartbeat("fatal", "prd-seed-failed", "seed-prd");
    process.exit(seedResult);
  }

  writeHeartbeat("running", "run-codex", "run-codex");
  const result = await runCodexIteration(opts);

  if (result === EXIT_COMPLETE) {
    writeHeartbeat("complete", "completion-token", "promote");
    const promoteResult = await maybeAutoPromote(opts);
    if (promoteResult !== EXIT_OK) {
      writeHeartbeat(promoteResult === EXIT_FATAL ? "fatal" : "retrying", "auto-promote-failed", "promote");
      process.exit(promoteResult);
    }
    markPrdStoriesPassed();
    writeHeartbeat("complete", "complete", "done");
    process.exit(EXIT_COMPLETE);
  }

  if (result === EXIT_RETRYABLE_FAILURE) {
    writeHeartbeat("retrying", "codex-exit-nonzero", "run-codex");
    process.exit(EXIT_RETRYABLE_FAILURE);
  }

  writeHeartbeat("idle", "iteration-ok", "done");
  process.exit(EXIT_OK);
}

main().catch((error) => {
  log("loop", "error", `unexpected error: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(EXIT_FATAL);
});
