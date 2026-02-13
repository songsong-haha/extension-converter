#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureDir, nowUtc } from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const PID_FILE = path.join(LOOP_DIR, "runner.pid");
const META_FILE = path.join(LOOP_DIR, "runner.meta.json");
const LOG_FILE = path.join(LOOP_DIR, "runner.log");
const ERR_LOG_FILE = path.join(LOOP_DIR, "runner.error.log");
const SUPERVISOR_SCRIPT = path.join(__dirname, "supervisor.mjs");
const SESSION_ID = `loop-${nowUtc().replace(/[:.]/g, "")}-${process.pid}`;

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function main() {
  ensureDir(LOOP_DIR);

  if (fs.existsSync(PID_FILE)) {
    const pid = Number((fs.readFileSync(PID_FILE, "utf8") || "").trim());
    if (pid > 0 && processAlive(pid)) {
      console.log(`[loop-bg] already running: pid=${pid}`);
      process.exit(0);
    }
    fs.rmSync(PID_FILE, { force: true });
    fs.rmSync(META_FILE, { force: true });
  }

  if (!fs.existsSync(SUPERVISOR_SCRIPT)) {
    console.error(`[loop-bg] missing supervisor script: ${SUPERVISOR_SCRIPT}`);
    process.exit(1);
  }

  const logFd = fs.openSync(LOG_FILE, "a");
  const errFd = fs.openSync(ERR_LOG_FILE, "a");
  const child = spawn("node", [SUPERVISOR_SCRIPT, ...process.argv.slice(2)], {
    cwd: REPO_ROOT,
    detached: true,
    env: { ...process.env, LOOP_SESSION_ID: SESSION_ID },
    stdio: ["ignore", logFd, errFd],
  });
  child.unref();

  const pid = child.pid;
  fs.writeFileSync(PID_FILE, `${pid}\n`, "utf8");

  let pgid = pid;
  let hasOwnProcessGroup = false;
  try {
    const pgidRaw = spawnSync("ps", ["-o", "pgid=", "-p", String(pid)], { encoding: "utf8" }).stdout;
    pgid = Number((pgidRaw || "").trim()) || pid;
    hasOwnProcessGroup = pgid === pid;
  } catch {
    // keep defaults
  }

  fs.writeFileSync(
    META_FILE,
    `${JSON.stringify({
      pid,
      pgid,
      hasOwnProcessGroup,
      session: SESSION_ID,
      args: process.argv.slice(2).join(" "),
      startedAt: nowUtc(),
    }, null, 2)}\n`,
    "utf8",
  );

  console.log(`[loop-bg] started: pid=${pid} pgid=${pgid} own_pgid=${hasOwnProcessGroup ? 1 : 0} session=${SESSION_ID}`);
}

main();
