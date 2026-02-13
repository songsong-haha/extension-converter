import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nowUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function log(prefix, level, message) {
  // Keep simple and grep-friendly.
  console.log(`[${prefix}][${level}][${nowUtc()}] ${message}`);
}

export function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function commandExists(cmd) {
  const result = spawnSync("bash", ["-lc", `command -v ${cmd}`], { encoding: "utf8" });
  return result.status === 0;
}

export function commandPath(cmd) {
  const result = spawnSync("bash", ["-lc", `command -v ${cmd}`], { encoding: "utf8" });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

export function spawnResult(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}

export function stripBranchFolder(branchName) {
  return branchName.replace(/^loop\//, "");
}

export function readText(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

export function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
}

export function appendText(filePath, text) {
  fs.appendFileSync(filePath, text, "utf8");
}

export function resolveRepoRoot(fromFileUrl) {
  const thisDir = path.dirname(new URL(fromFileUrl).pathname);
  return path.resolve(thisDir, "../..");
}
