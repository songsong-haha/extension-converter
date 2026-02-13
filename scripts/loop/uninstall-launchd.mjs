#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const LABEL = process.env.LOOP_LABEL || "com.extensionconverter.codex.loop";
const PLIST_PATH = path.join(os.homedir(), "Library/LaunchAgents", `${LABEL}.plist`);
const uid = String(process.getuid?.() ?? "");

spawnSync("launchctl", ["bootout", `gui/${uid}/${LABEL}`], { stdio: "ignore" });
spawnSync("launchctl", ["disable", `gui/${uid}/${LABEL}`], { stdio: "ignore" });

if (fs.existsSync(PLIST_PATH)) fs.rmSync(PLIST_PATH, { force: true });

console.log(`[loop-launchd] uninstalled: ${LABEL}`);
