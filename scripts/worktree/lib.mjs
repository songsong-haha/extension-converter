#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";

export function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

export function commandExists(cmd) {
  const r = spawnSync("bash", ["-lc", `command -v ${cmd}`], { encoding: "utf8" });
  return r.status === 0;
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    cwd: options.cwd,
    env: options.env,
  });
  return result;
}

export function runOrFail(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    if (options.stdio !== "inherit") {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    fail(`Error: command failed: ${command} ${args.join(" ")}`);
  }
  return result;
}

export function git(args, options = {}) {
  return run("git", args, options);
}

export function gitOrFail(args, options = {}) {
  return runOrFail("git", args, options);
}

export function repoRootOrFail() {
  const r = git(["rev-parse", "--show-toplevel"]);
  if (r.status !== 0) fail("Error: failed to resolve git repository root");
  return r.stdout.trim();
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function isValidName(value) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

export function exists(path) {
  return fs.existsSync(path);
}

export function branchExists(branch) {
  return git(["rev-parse", "--verify", branch], { stdio: "ignore" }).status === 0;
}
