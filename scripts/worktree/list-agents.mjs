#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { commandExists, fail, gitOrFail, repoRootOrFail } from "./lib.mjs";

if (!commandExists("git")) fail("Error: git is required");

const repoRoot = repoRootOrFail();
const metadataDir = path.join(repoRoot, ".agents");

console.log("== Git Worktrees ==");
gitOrFail(["worktree", "list"], { stdio: "inherit" });

console.log("\n== Agent Metadata ==");
if (!fs.existsSync(metadataDir)) {
  console.log("(none)");
  process.exit(0);
}

const files = fs
  .readdirSync(metadataDir)
  .filter((name) => name.endsWith(".json") || name.endsWith(".md"))
  .sort();

if (files.length === 0) console.log("(none)");
else for (const name of files) console.log(path.join(metadataDir, name));
