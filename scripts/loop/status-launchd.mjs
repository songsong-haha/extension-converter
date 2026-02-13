#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const LABEL = process.env.LOOP_LABEL || "com.extensionconverter.codex.loop";
const PLIST_PATH = path.join(os.homedir(), "Library/LaunchAgents", `${LABEL}.plist`);
const uid = String(process.getuid?.() ?? "");

console.log(`[loop-launchd] label: ${LABEL}`);
if (fs.existsSync(PLIST_PATH)) console.log(`[loop-launchd] plist exists: ${PLIST_PATH}`);
else console.log(`[loop-launchd] plist missing: ${PLIST_PATH}`);

console.log("[loop-launchd] launchctl print summary:");
const result = spawnSync("launchctl", ["print", `gui/${uid}/${LABEL}`], { encoding: "utf8" });
if (result.status !== 0) {
  console.log("(not loaded)");
} else {
  console.log((result.stdout || "").split(/\r?\n/).slice(0, 80).join("\n"));
}
