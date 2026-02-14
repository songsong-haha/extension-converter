#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const POLICY_PATH = path.join(LOOP_DIR, "policy.json");
const STATE_PATH = path.join(LOOP_DIR, "auto-promote-state.json");
const PROMOTE_LOCK_DIR = path.join(LOOP_DIR, ".promote.lock");
const PROMOTE_LOCK_PID = path.join(PROMOTE_LOCK_DIR, "pid");
const TEMP_WORKTREE_ROOT = path.join(LOOP_DIR, "tmp-worktrees");

const EXIT_OK = 0;
const EXIT_RETRYABLE_FAILURE = 20;
const EXIT_FATAL = 30;

function usage() {
  console.error("Usage: node scripts/worktree/auto-promote.mjs <agent-name> <task-slug> [target-branch]");
}

function nowUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function sanitizeSegment(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(cmd, args, stdio = "inherit", cwd = REPO_ROOT) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio,
  });
}

function runGit(args, stdio = "inherit", cwd = REPO_ROOT) {
  return run("git", args, stdio, cwd);
}

function runNpm(args, stdio = "inherit", cwd = REPO_ROOT) {
  return run("npm", args, stdio, cwd);
}

function processAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquirePromoteLock() {
  try {
    fs.mkdirSync(PROMOTE_LOCK_DIR, { recursive: false });
    fs.writeFileSync(PROMOTE_LOCK_PID, `${process.pid}\n`, "utf8");
    return true;
  } catch {
    const stalePidText = fs.existsSync(PROMOTE_LOCK_PID) ? fs.readFileSync(PROMOTE_LOCK_PID, "utf8") : "";
    const stalePid = Number(String(stalePidText || "").trim());
    if (processAlive(stalePid)) return false;
    try {
      fs.rmSync(PROMOTE_LOCK_DIR, { recursive: true, force: true });
      fs.mkdirSync(PROMOTE_LOCK_DIR, { recursive: false });
      fs.writeFileSync(PROMOTE_LOCK_PID, `${process.pid}\n`, "utf8");
      return true;
    } catch {
      return false;
    }
  }
}

function releasePromoteLock() {
  try {
    fs.rmSync(PROMOTE_LOCK_DIR, { recursive: true, force: true });
  } catch {
    // no-op
  }
}

function branchExists(branch) {
  const result = runGit(["rev-parse", "--verify", branch], "ignore");
  return result.status === 0;
}

function updateState(update) {
  const prev = readJsonSafe(STATE_PATH, {});
  writeJson(STATE_PATH, {
    ...prev,
    ...update,
    updatedAt: nowUtc(),
  });
}

function isAlreadyMerged(sourceBranch, targetBranch, cwd = REPO_ROOT) {
  const result = runGit(["merge-base", "--is-ancestor", sourceBranch, targetBranch], "ignore", cwd);
  return result.status === 0;
}

function isWorktreeClean(cwd = REPO_ROOT) {
  const result = runGit(["status", "--porcelain"], "pipe", cwd);
  if (result.status !== 0) return false;
  return (result.stdout || "").trim().length === 0;
}

function phaseDone(state, phase) {
  const phases = [
    "verified_branches",
    "pushed_sources",
    "worktree_prepared",
    "verified_preconditions",
    "merged_target",
    "pushed_target",
    "cleaned_local",
    "cleaned_remote",
    "worktree_pruned",
    "complete",
  ];
  const doneIdx = phases.indexOf(state.phase || "");
  const phaseIdx = phases.indexOf(phase);
  return doneIdx >= phaseIdx && phaseIdx >= 0;
}

function makeWorktreePath(taskSlug, targetBranch) {
  fs.mkdirSync(TEMP_WORKTREE_ROOT, { recursive: true });
  const stem = `${sanitizeSegment(taskSlug)}-${sanitizeSegment(targetBranch)}`;
  return path.join(TEMP_WORKTREE_ROOT, stem || "promote-main");
}

function pruneWorktrees() {
  runGit(["worktree", "prune"], "inherit");
}

function removeWorktreeBestEffort(worktreePath) {
  if (!worktreePath) return;
  runGit(["worktree", "remove", "--force", worktreePath], "pipe");
  fs.rmSync(worktreePath, { recursive: true, force: true });
}

function prepareMergeWorktree(targetBranch, worktreePath) {
  removeWorktreeBestEffort(worktreePath);

  const add = runGit(["worktree", "add", "--force", "--detach", worktreePath, targetBranch]);
  if (add.status !== 0) {
    console.error(`[auto-promote] fatal: unable to create merge worktree for ${targetBranch}`);
    return false;
  }

  const checkout = runGit(["checkout", targetBranch], "inherit", worktreePath);
  if (checkout.status !== 0) {
    console.error(`[auto-promote] fatal: unable to checkout target branch in worktree: ${targetBranch}`);
    return false;
  }

  return true;
}

function main() {
  const agentName = process.argv[2] || "";
  const taskSlug = process.argv[3] || "";
  let requestedTarget = process.argv[4] || "main";

  if (!agentName || !taskSlug) {
    usage();
    process.exit(EXIT_FATAL);
  }

  if (!acquirePromoteLock()) {
    console.error("[auto-promote] retryable: another promote process is already running");
    process.exit(EXIT_RETRYABLE_FAILURE);
  }

  let mergeWorktreePath = "";
  try {
    const policy = readJsonSafe(POLICY_PATH, {
      targetBranch: "main",
      enforceTargetBranch: true,
      requiredAdditionalAgents: ["qa"],
      pushSourceBranches: true,
      deleteRemoteBranches: true,
    });

    const policyTarget = String(policy.targetBranch || "main");
    if (policy.enforceTargetBranch && requestedTarget !== policyTarget) {
      console.log(`[auto-promote] target branch policy enforced: requested='${requestedTarget}' using='${policyTarget}'`);
      requestedTarget = policyTarget;
    }

    const sourceBranch = `agent/${agentName}/${taskSlug}`;
    const requiredAgents = Array.isArray(policy.requiredAdditionalAgents)
      ? policy.requiredAdditionalAgents.map((a) => String(a).trim()).filter(Boolean)
      : [];
    const requiredBranches = [sourceBranch, ...requiredAgents.map((a) => `agent/${a}/${taskSlug}`)];

    const stateKey = `${agentName}:${taskSlug}:${requestedTarget}`;
    const state = readJsonSafe(STATE_PATH, {});
    if (state?.key !== stateKey) {
      mergeWorktreePath = makeWorktreePath(taskSlug, requestedTarget);
      updateState({
        key: stateKey,
        phase: "init",
        taskSlug,
        sourceBranch,
        targetBranch: requestedTarget,
        requiredBranches,
        mergeWorktreePath,
        startedAt: nowUtc(),
      });
    }

    const current = readJsonSafe(STATE_PATH, {});
    mergeWorktreePath = String(current.mergeWorktreePath || makeWorktreePath(taskSlug, requestedTarget));

    pruneWorktrees();

    if (!phaseDone(current, "verified_branches")) {
      for (const branch of requiredBranches) {
        if (!branchExists(branch)) {
          console.error(`[auto-promote] fatal: required branch not found: ${branch}`);
          updateState({ phase: "failed", reason: `missing-branch:${branch}` });
          process.exit(EXIT_FATAL);
        }
      }
      updateState({ phase: "verified_branches" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "pushed_sources")) {
      if (policy.pushSourceBranches !== false) {
        for (const branch of requiredBranches) {
          const pushed = runGit(["push", "-u", "origin", branch]);
          if (pushed.status !== 0) {
            console.error(`[auto-promote] retryable: failed to push branch: ${branch}`);
            updateState({ phase: "failed", reason: `push-source-failed:${branch}` });
            process.exit(EXIT_RETRYABLE_FAILURE);
          }
        }
      }
      updateState({ phase: "pushed_sources" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "worktree_prepared")) {
      if (!prepareMergeWorktree(requestedTarget, mergeWorktreePath)) {
        updateState({ phase: "failed", reason: `worktree-prepare-failed:${requestedTarget}` });
        process.exit(EXIT_FATAL);
      }
      updateState({ phase: "worktree_prepared", mergeWorktreePath });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "verified_preconditions")) {
      if (!branchExists(requestedTarget)) {
        console.error(`[auto-promote] fatal: target branch not found locally: ${requestedTarget}`);
        updateState({ phase: "failed", reason: `missing-target:${requestedTarget}` });
        process.exit(EXIT_FATAL);
      }

      if (!isWorktreeClean(mergeWorktreePath)) {
        console.error("[auto-promote] fatal: worktree must be clean before merge");
        updateState({ phase: "failed", reason: "dirty-worktree" });
        process.exit(EXIT_FATAL);
      }

      const gate = runNpm(["run", "qa:gate"], "inherit", REPO_ROOT);
      if (gate.status !== 0) {
        console.error("[auto-promote] fatal: qa gate failed");
        updateState({ phase: "failed", reason: "qa-gate-failed" });
        process.exit(EXIT_FATAL);
      }

      updateState({ phase: "verified_preconditions" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "merged_target")) {
      if (!isAlreadyMerged(sourceBranch, requestedTarget, mergeWorktreePath)) {
        const merge = runGit(["merge", "--no-ff", sourceBranch, "-m", `merge: ${sourceBranch}`], "inherit", mergeWorktreePath);
        if (merge.status !== 0) {
          console.error(`[auto-promote] fatal: merge failed for ${sourceBranch}`);
          updateState({ phase: "failed", reason: `merge-failed:${sourceBranch}` });
          process.exit(EXIT_FATAL);
        }
      } else {
        console.log(`[auto-promote] merge skipped; already merged: ${sourceBranch} -> ${requestedTarget}`);
      }
      updateState({ phase: "merged_target" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "pushed_target")) {
      const pushed = runGit(["push", "origin", requestedTarget], "inherit", mergeWorktreePath);
      if (pushed.status !== 0) {
        console.error(`[auto-promote] retryable: push target failed: ${requestedTarget}`);
        updateState({ phase: "failed", reason: `push-target-failed:${requestedTarget}` });
        process.exit(EXIT_RETRYABLE_FAILURE);
      }
      updateState({ phase: "pushed_target" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "cleaned_local")) {
      const localCleanupBranches = Array.from(new Set([agentName, ...requiredAgents]));
      for (const owner of localCleanupBranches) {
        run("bash", ["scripts/worktree/remove-agent.sh", owner, taskSlug, "--delete-branch"]);
      }
      updateState({ phase: "cleaned_local" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "cleaned_remote")) {
      if (policy.deleteRemoteBranches !== false) {
        const deleteArgs = ["push", "origin", ...requiredBranches.map((b) => `:${b}`)];
        const deleted = runGit(deleteArgs);
        if (deleted.status !== 0) {
          console.log("[auto-promote] warning: remote branch deletion failed (non-blocking)");
        }
      }
      updateState({ phase: "cleaned_remote" });
    }

    if (!phaseDone(readJsonSafe(STATE_PATH, {}), "worktree_pruned")) {
      removeWorktreeBestEffort(mergeWorktreePath);
      pruneWorktrees();
      updateState({ phase: "worktree_pruned" });
    }

    updateState({ phase: "complete", completedAt: nowUtc() });
    console.log(`[auto-promote] completed for task: ${taskSlug}`);
    process.exit(EXIT_OK);
  } finally {
    releasePromoteLock();
  }
}

main();
