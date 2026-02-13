#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { commandPath, ensureDir } from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const LABEL = process.env.LOOP_LABEL || "com.extensionconverter.codex.loop";
const PLIST_DIR = path.join(os.homedir(), "Library/LaunchAgents");
const PLIST_PATH = path.join(PLIST_DIR, `${LABEL}.plist`);
const LOOP_DIR = path.join(REPO_ROOT, "loop");
const OUT_LOG = path.join(LOOP_DIR, "runner.log");
const ERR_LOG = path.join(LOOP_DIR, "runner.error.log");

const CODEX_BIN = commandPath("codex");
const ZSH_BIN = commandPath("zsh");

if (!CODEX_BIN || !ZSH_BIN) {
  console.error("[loop-launchd] missing required binaries (codex/zsh)");
  process.exit(1);
}

ensureDir(PLIST_DIR);
ensureDir(LOOP_DIR);

const prdFile = path.join(LOOP_DIR, "prd.json");
const prdExample = path.join(LOOP_DIR, "prd.json.example");
if (!fs.existsSync(prdFile) && fs.existsSync(prdExample)) {
  fs.copyFileSync(prdExample, prdFile);
  console.log("[loop-launchd] initialized loop/prd.json from example");
}

const pathDirs = [
  path.dirname(CODEX_BIN),
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
];
const pathValue = [...new Set(pathDirs.filter(Boolean))].join(":");
const runCmd = `cd \"${REPO_ROOT}\" && node \"${path.join(REPO_ROOT, "scripts/loop/supervisor.mjs")}\"`;

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${ZSH_BIN}</string>
    <string>-lc</string>
    <string>${runCmd}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${REPO_ROOT}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${pathValue}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${OUT_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${ERR_LOG}</string>
</dict>
</plist>
`;

fs.writeFileSync(PLIST_PATH, plist, "utf8");

const uid = String(process.getuid?.() ?? "");
spawnSync("launchctl", ["bootout", `gui/${uid}/${LABEL}`], { stdio: "ignore" });
const bootstrap = spawnSync("launchctl", ["bootstrap", `gui/${uid}`, PLIST_PATH], { stdio: "inherit" });
if (bootstrap.status !== 0) process.exit(bootstrap.status || 1);
spawnSync("launchctl", ["enable", `gui/${uid}/${LABEL}`], { stdio: "inherit" });
spawnSync("launchctl", ["kickstart", "-k", `gui/${uid}/${LABEL}`], { stdio: "inherit" });

console.log(`[loop-launchd] installed and started: ${LABEL}`);
console.log(`[loop-launchd] plist: ${PLIST_PATH}`);
console.log(`[loop-launchd] logs: ${OUT_LOG} / ${ERR_LOG}`);
