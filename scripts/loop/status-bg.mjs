#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const PID_FILE = path.join(REPO_ROOT, "loop/runner.pid");
const META_FILE = path.join(REPO_ROOT, "loop/runner.meta.json");
const LOG_FILE = path.join(REPO_ROOT, "loop/runner.log");
const HEARTBEAT_FILE = path.join(REPO_ROOT, "loop/heartbeat.json");
const STATE_FILE = path.join(REPO_ROOT, "loop/supervisor-state.json");

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function tailLines(text, count) {
  return text.split(/\r?\n/).slice(-count).join("\n");
}

function main() {
  if (!fs.existsSync(PID_FILE)) {
    console.log("[loop-bg] not running (no pid file)");
    process.exit(0);
  }

  const pid = Number((fs.readFileSync(PID_FILE, "utf8") || "").trim());
  if (!pid) {
    console.log("[loop-bg] not running (empty pid file)");
    process.exit(0);
  }

  if (processAlive(pid)) console.log(`[loop-bg] running pid=${pid}`);
  else console.log(`[loop-bg] not running (stale pid=${pid})`);

  if (fs.existsSync(META_FILE)) {
    console.log("[loop-bg] meta:");
    console.log(fs.readFileSync(META_FILE, "utf8"));
  }

  if (fs.existsSync(STATE_FILE)) {
    console.log("[loop-bg] supervisor state:");
    console.log(fs.readFileSync(STATE_FILE, "utf8"));
  }

  if (fs.existsSync(HEARTBEAT_FILE)) {
    console.log("[loop-bg] heartbeat:");
    console.log(fs.readFileSync(HEARTBEAT_FILE, "utf8"));
  }

  if (fs.existsSync(LOG_FILE)) {
    console.log("[loop-bg] log tail:");
    console.log(tailLines(fs.readFileSync(LOG_FILE, "utf8"), 40));
  }
}

main();
