#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LOOP_DIR = path.join(REPO_ROOT, "loop");

const PID_FILE = path.join(LOOP_DIR, "runner.pid");
const META_FILE = path.join(LOOP_DIR, "runner.meta.json");
const STATE_FILE = path.join(LOOP_DIR, "supervisor-state.json");
const HEARTBEAT_FILE = path.join(LOOP_DIR, "heartbeat.json");
const PROMOTION_FILE = path.join(LOOP_DIR, "promotion-controller.json");
const AUTO_PROMOTE_STATE_FILE = path.join(LOOP_DIR, "auto-promote-state.json");
const PRD_FILE = path.join(LOOP_DIR, "prd.json");
const LOG_FILE = path.join(LOOP_DIR, "runner.log");

const PORT = Number(process.env.LOOP_ADMIN_PORT || 4317);
const HOST = process.env.LOOP_ADMIN_HOST || "127.0.0.1";
const LOG_TAIL_LINES = Number(process.env.LOOP_ADMIN_LOG_LINES || 120);
const ADMIN_TOKEN = process.env.LOOP_ADMIN_TOKEN || "";
const BREAKER_OPEN_SECONDS = Number(process.env.LOOP_PROMOTE_BREAKER_OPEN_SECONDS || 300);

function nowUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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

function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readTextSafe(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, body) {
  fs.writeFileSync(filePath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
}

function tailLines(filePath, count = 80) {
  const text = readTextSafe(filePath, "");
  if (!text) return "";
  return text.split(/\r?\n/).slice(-count).join("\n");
}

function computeErrorSignature(text) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  return normalized || "unknown";
}

function classifyPromoteFailure(exitCode, combinedOutput) {
  const out = String(combinedOutput || "");
  if (/ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find module/i.test(out)) return "config-fatal";
  if (/missing auto-promote script|missing required file|missing .* script/i.test(out)) return "config-fatal";
  if (/fatal: required branch not found|fatal: target branch not found/i.test(out)) return "policy-terminal";
  if (/fatal: worktree must be clean before merge|fatal: qa gate failed|fatal: merge failed/i.test(out)) return "policy-terminal";
  if (exitCode === 30) return "policy-terminal";
  if (exitCode === 20) return "retryable";
  return "unknown";
}

function getTaskSlugFromPrd() {
  const prd = readJsonSafe(PRD_FILE, {});
  const branchName = typeof prd?.branchName === "string" ? prd.branchName : "";
  const match = branchName.match(/^agent\/growth\/(.+)$/);
  return match ? match[1] : "";
}

function getLoopStatus() {
  const pidRaw = readTextSafe(PID_FILE, "").trim();
  const pid = Number(pidRaw);
  const running = processAlive(pid);

  return {
    updatedAt: new Date().toISOString(),
    process: {
      hasPidFile: fs.existsSync(PID_FILE),
      pid: Number.isFinite(pid) ? pid : null,
      running,
    },
    meta: readJsonSafe(META_FILE, null),
    supervisor: readJsonSafe(STATE_FILE, null),
    heartbeat: readJsonSafe(HEARTBEAT_FILE, null),
    promotionController: readJsonSafe(PROMOTION_FILE, null),
    autoPromoteState: readJsonSafe(AUTO_PROMOTE_STATE_FILE, null),
    logTail: tailLines(LOG_FILE, LOG_TAIL_LINES),
  };
}

function resetBreaker(taskSlug = "") {
  writeJsonFile(PROMOTION_FILE, {
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
    updatedAt: nowUtc(),
  });
}

function openBreakerOnFailure({ taskSlug, failureClass, signature, consecutiveFailures }) {
  const until = new Date(Date.now() + Math.max(1, BREAKER_OPEN_SECONDS) * 1000).toISOString();
  writeJsonFile(PROMOTION_FILE, {
    state: "open",
    consecutiveFailures,
    openedAt: nowUtc(),
    quarantineUntil: until,
    lastFailureClass: failureClass,
    lastErrorSignature: signature,
    lastTask: taskSlug,
    policyRetryCount: failureClass === "policy-terminal" ? 1 : 0,
    lastFailureAt: nowUtc(),
    nextRetryAt: "",
    updatedAt: nowUtc(),
  });
  return until;
}

function runNode(args, cwd = REPO_ROOT) {
  return spawnSync("node", args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

function isAuthorized(req) {
  if (!ADMIN_TOKEN) return true;
  const header = String(req.headers.authorization || "");
  return header === `Bearer ${ADMIN_TOKEN}`;
}

function writeJson(res, statusCode, body) {
  const payload = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function writeHtml(res, html) {
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(html);
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Loop Admin</title>
  <style>
    :root {
      --bg: #0e1116;
      --panel: #161b22;
      --line: #2b3542;
      --text: #dbe6f2;
      --muted: #8ea2b8;
      --ok: #2bb673;
      --warn: #f59e0b;
      --bad: #ef4444;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at 20% -20%, #1f2a39 0%, var(--bg) 45%);
      color: var(--text);
      font-family: var(--sans);
    }
    .wrap { max-width: 1200px; margin: 24px auto; padding: 0 16px 24px; }
    .header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    h1 { margin: 0; font-size: 24px; }
    .muted { color: var(--muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .panel {
      background: linear-gradient(180deg, #1b2430, var(--panel));
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      min-height: 120px;
    }
    .panel h2 { margin: 0 0 8px; font-size: 14px; color: #c7d8ea; }
    .kv { display: grid; grid-template-columns: 120px 1fr; gap: 6px 10px; font-size: 13px; }
    .k { color: var(--muted); }
    .v { font-family: var(--mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .ok { background: rgba(43,182,115,.2); color: #5ee3a0; border: 1px solid rgba(94,227,160,.3); }
    .bad { background: rgba(239,68,68,.2); color: #ff9d9d; border: 1px solid rgba(255,157,157,.3); }
    .warn { background: rgba(245,158,11,.2); color: #ffd08a; border: 1px solid rgba(255,208,138,.3); }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    button {
      border: 1px solid var(--line);
      background: #111722;
      color: var(--text);
      font-size: 12px;
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
    }
    button:hover { border-color: #4b6078; }
    pre {
      margin: 0;
      padding: 12px;
      border-radius: 12px;
      background: #0b1016;
      border: 1px solid var(--line);
      color: #c8d7e8;
      font-family: var(--mono);
      font-size: 12px;
      overflow: auto;
      max-height: 48vh;
      line-height: 1.45;
    }
    .section { margin-top: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Loop Admin</h1>
      <div class="muted" id="updated">loading…</div>
    </div>

    <div class="grid">
      <div class="panel">
        <h2>Process</h2>
        <div class="kv">
          <div class="k">running</div><div class="v" id="running">-</div>
          <div class="k">pid</div><div class="v" id="pid">-</div>
          <div class="k">session</div><div class="v" id="session">-</div>
          <div class="k">args</div><div class="v" id="args">-</div>
        </div>
      </div>

      <div class="panel">
        <h2>Supervisor</h2>
        <div class="kv">
          <div class="k">status</div><div class="v" id="sup-status">-</div>
          <div class="k">detail</div><div class="v" id="sup-detail">-</div>
          <div class="k">streak</div><div class="v" id="sup-streak">-</div>
          <div class="k">delay</div><div class="v" id="sup-delay">-</div>
        </div>
      </div>

      <div class="panel">
        <h2>Runner Heartbeat</h2>
        <div class="kv">
          <div class="k">phase</div><div class="v" id="hb-phase">-</div>
          <div class="k">detail</div><div class="v" id="hb-detail">-</div>
          <div class="k">updatedAt</div><div class="v" id="hb-updated">-</div>
          <div class="k">lastOutputAt</div><div class="v" id="hb-output">-</div>
        </div>
      </div>

      <div class="panel">
        <h2>Promote Breaker</h2>
        <div class="kv">
          <div class="k">state</div><div class="v" id="br-state">-</div>
          <div class="k">failures</div><div class="v" id="br-fail">-</div>
          <div class="k">lastClass</div><div class="v" id="br-class">-</div>
          <div class="k">until</div><div class="v" id="br-until">-</div>
          <div class="k">retryCount</div><div class="v" id="br-retry">-</div>
          <div class="k">nextRetryAt</div><div class="v" id="br-next-retry">-</div>
        </div>
        <div class="controls">
          <button id="btn-reset">Reset Breaker</button>
          <button id="btn-retry">Retry Promote</button>
          <button id="btn-stop">Stop Loop</button>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="muted">Action Events</h2>
      <pre id="events">(no events)</pre>
    </div>

    <div class="section">
      <h2 class="muted">Runner Log Tail</h2>
      <pre id="log">loading…</pre>
    </div>
  </div>

  <script>
    const $ = (id) => document.getElementById(id);
    const set = (id, v) => { $(id).textContent = v == null || v === "" ? "-" : String(v); };
    const eventLines = [];

    const setState = (id, value) => {
      const el = $(id);
      el.innerHTML = "";
      const span = document.createElement("span");
      span.className = "pill " + (value === "running" || value === "closed" ? "ok" : value === "open" || value === "fatal" ? "bad" : "warn");
      span.textContent = value || "-";
      el.appendChild(span);
    };

    const countdown = (iso) => {
      if (!iso) return "-";
      const ms = Date.parse(iso) - Date.now();
      if (!Number.isFinite(ms)) return iso;
      if (ms <= 0) return iso + " (expired)";
      const sec = Math.floor(ms / 1000);
      return iso + " (in " + sec + "s)";
    };

    function pushEvent(text) {
      const line = new Date().toISOString() + " " + text;
      eventLines.unshift(line);
      if (eventLines.length > 80) eventLines.pop();
      set('events', eventLines.join('\n'));
    }

    async function callAction(name) {
      try {
        pushEvent('[request] ' + name);
        const res = await fetch('/api/actions/' + name, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        const data = await res.json();
        if (!res.ok) {
          pushEvent('[error] ' + name + ' -> ' + (data.error || ('http-' + res.status)));
          return;
        }
        pushEvent('[ok] ' + name + ' -> ' + JSON.stringify(data));
        await load();
      } catch (e) {
        pushEvent('[error] ' + name + ' -> ' + e);
      }
    }

    async function load() {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        const data = await res.json();

        set('updated', 'updated: ' + (data.updatedAt || '-'));

        const p = data.process || {};
        setState('running', p.running ? 'running' : 'stopped');
        set('pid', p.pid);

        const meta = data.meta || {};
        set('session', meta.session);
        set('args', meta.args);

        const s = data.supervisor || {};
        setState('sup-status', s.status);
        set('sup-detail', s.detail);
        set('sup-streak', s.failureStreak);
        set('sup-delay', s.nextDelaySeconds);

        const hb = data.heartbeat || {};
        set('hb-phase', hb.phase);
        set('hb-detail', hb.detail);
        set('hb-updated', hb.updatedAt);
        set('hb-output', hb.lastOutputAt);

        const br = data.promotionController || {};
        setState('br-state', br.state);
        set('br-fail', br.consecutiveFailures);
        set('br-class', br.lastFailureClass);
        set('br-until', countdown(br.quarantineUntil));
        set('br-retry', br.policyRetryCount);
        set('br-next-retry', countdown(br.nextRetryAt));

        set('log', data.logTail || '(empty)');
      } catch (e) {
        set('updated', 'failed to fetch status: ' + e);
      }
    }

    $('btn-reset').addEventListener('click', () => callAction('reset-breaker'));
    $('btn-retry').addEventListener('click', () => callAction('retry-promote'));
    $('btn-stop').addEventListener('click', () => callAction('stop-loop'));

    load();
    setInterval(load, 1500);
  </script>
</body>
</html>`;
}

function parseActionName(urlPath) {
  const prefix = "/api/actions/";
  if (!urlPath.startsWith(prefix)) return "";
  return urlPath.slice(prefix.length);
}

function handleResetBreaker(res) {
  const taskSlug = getTaskSlugFromPrd();
  resetBreaker(taskSlug);
  writeJson(res, 200, {
    ok: true,
    action: "reset-breaker",
    taskSlug,
    updatedAt: nowUtc(),
  });
}

function handleRetryPromote(res) {
  const taskSlug = getTaskSlugFromPrd() || String(readJsonSafe(PROMOTION_FILE, {})?.lastTask || "");
  if (!taskSlug) {
    writeJson(res, 400, {
      ok: false,
      action: "retry-promote",
      error: "missing-task-slug",
      detail: "loop/prd.json branchName must match agent/growth/<task-slug>",
    });
    return;
  }

  resetBreaker(taskSlug);

  const doctor = runNode(["scripts/loop/doctor.mjs"]);
  if (doctor.status !== 0) {
    writeJson(res, 500, {
      ok: false,
      action: "retry-promote",
      step: "doctor",
      exitCode: doctor.status ?? 1,
      stdout: doctor.stdout || "",
      stderr: doctor.stderr || "",
    });
    return;
  }

  const promote = runNode(["scripts/worktree/auto-promote.mjs", "growth", taskSlug, "main"]);
  const combinedOutput = `${promote.stdout || ""}\n${promote.stderr || ""}`;
  const failureClass = classifyPromoteFailure(promote.status ?? 1, combinedOutput);

  if (promote.status === 0) {
    resetBreaker(taskSlug);
    writeJson(res, 200, {
      ok: true,
      action: "retry-promote",
      taskSlug,
      doctorExitCode: doctor.status ?? 0,
      promoteExitCode: 0,
      failureClass: "",
      updatedAt: nowUtc(),
    });
    return;
  }

  const prev = readJsonSafe(PROMOTION_FILE, {});
  const failures = Math.max(1, Number(prev?.consecutiveFailures || 0) + 1);
  const until = openBreakerOnFailure({
    taskSlug,
    failureClass,
    signature: computeErrorSignature(combinedOutput),
    consecutiveFailures: failures,
  });

  writeJson(res, 500, {
    ok: false,
    action: "retry-promote",
    taskSlug,
    doctorExitCode: doctor.status ?? 0,
    promoteExitCode: promote.status ?? 1,
    failureClass,
    breakerUntil: until,
    stdout: promote.stdout || "",
    stderr: promote.stderr || "",
  });
}

function handleStopLoop(res) {
  const stop = runNode(["scripts/loop/stop-bg.mjs"]);
  const ok = stop.status === 0;
  writeJson(res, ok ? 200 : 500, {
    ok,
    action: "stop-loop",
    exitCode: stop.status ?? 1,
    stdout: stop.stdout || "",
    stderr: stop.stderr || "",
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/status") {
    writeJson(res, 200, getLoopStatus());
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    writeHtml(res, dashboardHtml());
    return;
  }

  if (req.method === "POST" && url.pathname.startsWith("/api/actions/")) {
    if (!isAuthorized(req)) {
      writeJson(res, 401, { error: "unauthorized" });
      return;
    }
    const action = parseActionName(url.pathname);
    if (action === "reset-breaker") {
      handleResetBreaker(res);
      return;
    }
    if (action === "retry-promote") {
      handleRetryPromote(res);
      return;
    }
    if (action === "stop-loop") {
      handleStopLoop(res);
      return;
    }
    writeJson(res, 404, { error: "unknown-action" });
    return;
  }

  writeJson(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`[loop-admin] listening on http://${HOST}:${PORT}`);
});
