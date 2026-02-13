#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sleep, readJsonSafe } from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const PID_FILE = path.join(REPO_ROOT, "loop/runner.pid");
const META_FILE = path.join(REPO_ROOT, "loop/runner.meta.json");
const STATE_FILE = path.join(REPO_ROOT, "loop/supervisor-state.json");

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!fs.existsSync(PID_FILE)) {
    console.log("[loop-bg] no pid file");
    return;
  }

  const pid = Number((fs.readFileSync(PID_FILE, "utf8") || "").trim());
  if (!pid) {
    fs.rmSync(PID_FILE, { force: true });
    fs.rmSync(META_FILE, { force: true });
    console.log("[loop-bg] pid file was empty");
    return;
  }

  const meta = readJsonSafe(META_FILE, {});
  const pgid = Number(meta?.pgid || 0);
  const hasOwnProcessGroup = Boolean(meta?.hasOwnProcessGroup);

  if (processAlive(pid)) {
    if (pgid > 0 && hasOwnProcessGroup) {
      try {
        process.kill(-pgid, "SIGTERM");
      } catch {
        // fallback below
      }
      console.log(`[loop-bg] sent TERM to process group pgid=${pgid} (pid=${pid})`);
    } else {
      process.kill(pid, "SIGTERM");
      console.log(`[loop-bg] sent TERM to pid=${pid}`);
    }

    for (let i = 0; i < 20; i += 1) {
      if (!processAlive(pid)) break;
      await sleep(250);
    }

    if (processAlive(pid)) {
      if (pgid > 0 && hasOwnProcessGroup) {
        try {
          process.kill(-pgid, "SIGKILL");
          console.log(`[loop-bg] escalated KILL to process group pgid=${pgid}`);
        } catch {
          // no-op
        }
      } else {
        try {
          process.kill(pid, "SIGKILL");
          console.log(`[loop-bg] escalated KILL to pid=${pid}`);
        } catch {
          // no-op
        }
      }
    }
  } else {
    console.log(`[loop-bg] process not running pid=${pid}`);
  }

  fs.rmSync(PID_FILE, { force: true });
  fs.rmSync(META_FILE, { force: true });

  if (fs.existsSync(STATE_FILE)) {
    console.log("[loop-bg] last supervisor state:");
    console.log(fs.readFileSync(STATE_FILE, "utf8"));
  }
}

main().catch((error) => {
  console.error(`[loop-bg] stop failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
