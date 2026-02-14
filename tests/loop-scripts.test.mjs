import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = process.cwd();
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const PID_FILE = path.join(LOOP_DIR, "runner.pid");
const LOCK_DIR = path.join(LOOP_DIR, ".runner.lock");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    ...options,
  });
  return result;
}

function runNpm(script, extraArgs = [], options = {}) {
  return run("npm", ["run", "-s", script, "--", ...extraArgs], options);
}

function stopBg() {
  run("node", ["scripts/loop/stop-bg.mjs"]);
  fs.rmSync(LOCK_DIR, { recursive: true, force: true });
}

function createMockCodex(scriptBody) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-mock-"));
  const bin = path.join(dir, "codex");
  fs.writeFileSync(bin, `#!/usr/bin/env bash\n${scriptBody}\n`, { mode: 0o755 });
  return { dir, bin };
}

beforeEach(() => {
  stopBg();
});

afterEach(() => {
  stopBg();
});

test("codex-loop help exits 0", () => {
  const result = run("node", ["scripts/loop/codex-loop.mjs", "--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
});

test("codex-loop exits with COMPLETE code when token is emitted", () => {
  const mock = createMockCodex("echo '<promise>COMPLETE</promise>'\nexit 0");
  const env = { ...process.env, PATH: `${mock.dir}:${process.env.PATH}` };
  const result = run("node", ["scripts/loop/codex-loop.mjs", "--max-iterations", "1", "--sleep-seconds", "0"], { env });
  assert.equal(result.status, 10);
  assert.match(result.stdout + result.stderr, /completion token found/);
});

test("package loop scripts reference existing paths", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  const scripts = pkg?.scripts || {};
  for (const [name, command] of Object.entries(scripts)) {
    const match = String(command).match(/(?:^|\s)(?:node|bash)\s+(scripts\/[^\s]+)/);
    if (!match) continue;
    const scriptPath = path.join(REPO_ROOT, match[1]);
    assert.equal(fs.existsSync(scriptPath), true, `missing script target for ${name}: ${match[1]}`);
  }
});

test("background start/status/stop works and prevents duplicate start", async () => {
  const mock = createMockCodex("echo '<promise>COMPLETE</promise>'\nexit 0");
  const env = {
    ...process.env,
    PATH: `${mock.dir}:${process.env.PATH}`,
    LOOP_SUPERVISOR_COMPLETE_DELAY: "1",
    LOOP_SUPERVISOR_DELAY_BASE: "1",
  };

  const start1 = run("node", ["scripts/loop/start-bg.mjs", "--sleep-seconds", "0"], { env });
  assert.equal(start1.status, 0);
  assert.match(start1.stdout, /started: pid=/);

  const start2 = run("node", ["scripts/loop/start-bg.mjs", "--sleep-seconds", "0"], { env });
  assert.equal(start2.status, 0);
  assert.match(start2.stdout, /already running/);

  await new Promise((r) => setTimeout(r, 2200));

  const status = run("node", ["scripts/loop/status-bg.mjs"], { env });
  assert.equal(status.status, 0);
  assert.match(status.stdout, /running pid=|stale pid=/);
  assert.match(status.stdout, /supervisor state:/);

  const stop = run("node", ["scripts/loop/stop-bg.mjs"], { env });
  assert.equal(stop.status, 0);

  assert.equal(fs.existsSync(PID_FILE), false);
});

test("npm loop:bg:start path updates heartbeat/state files", async () => {
  const mock = createMockCodex("echo '<promise>COMPLETE</promise>'\nexit 0");
  const env = {
    ...process.env,
    PATH: `${mock.dir}:${process.env.PATH}`,
    LOOP_SUPERVISOR_COMPLETE_DELAY: "1",
    LOOP_SUPERVISOR_DELAY_BASE: "1",
  };

  const start = runNpm("loop:bg:start", ["--sleep-seconds", "0"], { env });
  assert.equal(start.status, 0);

  await new Promise((r) => setTimeout(r, 1600));

  const heartbeatPath = path.join(LOOP_DIR, "heartbeat.json");
  const statePath = path.join(LOOP_DIR, "supervisor-state.json");
  assert.equal(fs.existsSync(heartbeatPath), true);
  assert.equal(fs.existsSync(statePath), true);

  const heartbeat = JSON.parse(fs.readFileSync(heartbeatPath, "utf8"));
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(typeof heartbeat.updatedAt, "string");
  assert.equal(typeof state.updatedAt, "string");
});

test("supervisor applies retry/backoff state on repeated failures", async () => {
  const mock = createMockCodex("echo 'mock failure' 1>&2\nexit 7");
  const env = {
    ...process.env,
    PATH: `${mock.dir}:${process.env.PATH}`,
    LOOP_SUPERVISOR_DELAY_BASE: "1",
    LOOP_SUPERVISOR_DELAY_MAX: "2",
  };

  const start = run("node", ["scripts/loop/start-bg.mjs", "--sleep-seconds", "0", "--failure-backoff-base", "1", "--failure-backoff-max", "2"], { env });
  assert.equal(start.status, 0);

  await new Promise((r) => setTimeout(r, 3300));

  const status = run("node", ["scripts/loop/status-bg.mjs"], { env });
  assert.equal(status.status, 0);
  assert.match(status.stdout, /"failureStreak": [23]/);
  assert.match(status.stdout, /retryable failure streak=2/);
});

test("codex-loop kills stalled codex exec and treats it as retryable", () => {
  const mock = createMockCodex("sleep 5\nexit 0");
  const env = {
    ...process.env,
    PATH: `${mock.dir}:${process.env.PATH}`,
    LOOP_HEARTBEAT_INTERVAL_SECONDS: "1",
    LOOP_CODEX_STALL_TIMEOUT_SECONDS: "1",
    LOOP_CODEX_KILL_GRACE_MS: "100",
  };

  const result = run(
    "node",
    ["scripts/loop/codex-loop.mjs", "--max-iterations", "1", "--sleep-seconds", "0"],
    { env },
  );
  assert.equal(result.status, 20);
  assert.match(result.stdout + result.stderr, /codex appears stalled|stalled codex process was killed/);
});
