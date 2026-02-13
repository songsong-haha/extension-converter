#!/usr/bin/env node
import fs from "node:fs";

const backlogPath = "docs/GROWTH_BACKLOG.md";
const outPath = "test-results/ai-qa/next-task.md";

if (!fs.existsSync(backlogPath)) {
  fs.mkdirSync("test-results/ai-qa", { recursive: true });
  fs.writeFileSync(outPath, "# Next Task\n\n- backlog file not found\n", "utf8");
  process.exit(0);
}

const lines = fs.readFileSync(backlogPath, "utf8").split("\n");
const next = lines.find((line) => line.trim().startsWith("- [ ]"));

fs.mkdirSync("test-results/ai-qa", { recursive: true });
if (!next) {
  fs.writeFileSync(outPath, "# Next Task\n\n- no open micro-task in backlog\n", "utf8");
  process.exit(0);
}

fs.writeFileSync(outPath, `# Next Task\n\n${next}\n`, "utf8");
console.log(`[growth-loop] next task: ${next}`);
