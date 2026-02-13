#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { branchExists, commandExists, ensureDir, fail, gitOrFail, isValidName, repoRootOrFail } from "./lib.mjs";

if (!commandExists("git")) fail("Error: git is required");

const [agentName, taskSlugArg, baseBranchArg, taskTemplateArg] = process.argv.slice(2);
if (!agentName) {
  console.error("Usage: node scripts/worktree/create-agent.mjs <agent-name> [task-slug] [base-branch] [task-template]");
  console.error("Example: node scripts/worktree/create-agent.mjs frontend hero-redesign main ga");
  process.exit(1);
}

const taskSlug = taskSlugArg || "general";
const baseBranch = baseBranchArg || "main";
const taskTemplateName = taskTemplateArg || "default";

if (!isValidName(agentName)) fail("Error: agent-name may only contain letters, numbers, ., _, -");
if (!isValidName(taskSlug)) fail("Error: task-slug may only contain letters, numbers, ., _, -");

const repoRoot = repoRootOrFail();
const worktreeRoot = path.join(repoRoot, ".worktrees");
const metadataDir = path.join(repoRoot, ".agents");
const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

const agentBranch = `agent/${agentName}/${taskSlug}`;
const worktreePath = path.join(worktreeRoot, `${agentName}-${taskSlug}`);
const metadataPath = path.join(metadataDir, `${agentName}-${taskSlug}.json`);
const taskCardPath = path.join(metadataDir, `${agentName}-${taskSlug}.md`);
const defaultTemplate = path.join(metadataDir, "templates/agent-task-template.md");
const taskCardTemplate =
  taskTemplateName === "default"
    ? defaultTemplate
    : path.join(metadataDir, `templates/${taskTemplateName}-agent-task-template.md`);

ensureDir(worktreeRoot);
ensureDir(metadataDir);

if (fs.existsSync(worktreePath)) fail(`Error: worktree path already exists: ${worktreePath}`);

const localBaseExists = branchExists(baseBranch);
const remoteBaseExists = branchExists(`origin/${baseBranch}`);
if (!localBaseExists && !remoteBaseExists) {
  fail(`Error: base branch '${baseBranch}' not found locally or on origin`);
}

if (branchExists(agentBranch)) gitOrFail(["worktree", "add", worktreePath, agentBranch], { stdio: "inherit" });
else gitOrFail(["worktree", "add", "-b", agentBranch, worktreePath, baseBranch], { stdio: "inherit" });

const metadata = {
  agent: agentName,
  task: taskSlug,
  branch: agentBranch,
  base: baseBranch,
  worktree: `.worktrees/${agentName}-${taskSlug}`,
  created_at_utc: timestamp,
};
fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

const selectedTemplate = fs.existsSync(taskCardTemplate)
  ? taskCardTemplate
  : fs.existsSync(defaultTemplate)
    ? defaultTemplate
    : "";

if (selectedTemplate) {
  let content = fs.readFileSync(selectedTemplate, "utf8");
  content = content
    .replaceAll("{{AGENT_NAME}}", agentName)
    .replaceAll("{{TASK_SLUG}}", taskSlug)
    .replaceAll("{{AGENT_BRANCH}}", agentBranch)
    .replaceAll("{{WORKTREE_PATH}}", `.worktrees/${agentName}-${taskSlug}`);
  fs.writeFileSync(taskCardPath, content, "utf8");
  if (!fs.existsSync(taskCardTemplate) && taskTemplateName !== "default") {
    console.error(`Warning: template '${taskTemplateName}' not found. Used default template.`);
  }
}

console.log("Created agent worktree");
console.log(`- branch:   ${agentBranch}`);
console.log(`- worktree: ${worktreePath}`);
console.log(`- metadata: ${metadataPath}`);
if (fs.existsSync(taskCardPath)) console.log(`- taskcard: ${taskCardPath}`);
