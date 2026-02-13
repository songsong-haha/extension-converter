#!/usr/bin/env node
import path from "node:path";
import { exists, fail, repoRootOrFail, runOrFail } from "./lib.mjs";

const [taskSlug, baseBranchArg] = process.argv.slice(2);
if (!taskSlug) {
  console.error("Usage: node scripts/worktree/start-growth-task.mjs <task-slug> [base-branch]");
  console.error("Example: node scripts/worktree/start-growth-task.mjs hero-copy-a-b main");
  process.exit(1);
}

const baseBranch = baseBranchArg || "main";
const repoRoot = repoRootOrFail();
const createScript = path.join(repoRoot, "scripts/worktree/create-agent.mjs");
if (!exists(createScript)) fail("Error: create-agent.mjs not found");

console.log("[growth-loop] creating implementation worktree");
runOrFail("node", [createScript, "growth", taskSlug, baseBranch, "default"], { stdio: "inherit" });

console.log("[growth-loop] creating mandatory QA worktree");
runOrFail("node", [createScript, "qa", taskSlug, baseBranch, "default"], { stdio: "inherit" });

console.log("[growth-loop] creating mandatory CEO/PO worktree");
runOrFail("node", [createScript, "ceo", taskSlug, baseBranch, "default"], { stdio: "inherit" });

console.log("[growth-loop] creating mandatory analytics worktree");
runOrFail("node", [createScript, "analytics", taskSlug, baseBranch, "default"], { stdio: "inherit" });

console.log("[growth-loop] creating mandatory designer worktree");
runOrFail("node", [createScript, "designer", taskSlug, baseBranch, "default"], { stdio: "inherit" });

console.log("[growth-loop] created mandatory core-team worktrees");
console.log(`- product owner: agent/ceo/${taskSlug}`);
console.log(`- implementer:   agent/growth/${taskSlug}`);
console.log(`- reviewer:      agent/qa/${taskSlug}`);
console.log(`- analytics:     agent/analytics/${taskSlug}`);
console.log(`- designer:      agent/designer/${taskSlug}`);
