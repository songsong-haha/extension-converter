#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name) {
  const key = `--${name}`;
  const index = args.indexOf(key);
  if (index === -1) return "";
  return (args[index + 1] || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function ensureFile(filePath, initialContent) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, initialContent, "utf8");
  }
}

function appendSection(filePath, sectionText) {
  fs.appendFileSync(filePath, sectionText, "utf8");
}

function normalizeList(text) {
  if (!text) return [];
  return text
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBulletList(items) {
  if (items.length === 0) return "- (none)\n";
  return items.map((item) => `- ${item}\n`).join("");
}

const summary = getArg("summary");
const mistakes = normalizeList(getArg("mistakes"));
const improvements = normalizeList(getArg("improvements"));
const globalLessons = normalizeList(getArg("global"));
const localLessons = normalizeList(getArg("local"));

const hasAnyInput =
  summary ||
  mistakes.length > 0 ||
  improvements.length > 0 ||
  globalLessons.length > 0 ||
  localLessons.length > 0;

if (!hasAnyInput) {
  console.error(
    "No input provided. Use --summary and/or --mistakes/--improvements/--global/--local."
  );
  process.exit(1);
}

const timestamp = nowIso();
const projectName = path.basename(process.cwd());
const globalCodexPath = path.join(os.homedir(), ".codex", "codex.md");
const localCodexPath = path.join(process.cwd(), "codex.md");

const globalHeader = `# Codex Global Memory

Use this file only for patterns that are valid across almost all projects.

## Entries
`;

const localHeader = `# Codex Local Memory (${projectName})

Use this file for project-specific practices, pitfalls, and repeatable workflows.

## Entries
`;

ensureFile(globalCodexPath, globalHeader);
ensureFile(localCodexPath, localHeader);

const globalSection = `
### ${timestamp}
Context: ${projectName}
Summary: ${summary || "(not provided)"}
Global Lessons:
${toBulletList(globalLessons)}
Mistakes To Avoid:
${toBulletList(mistakes)}
Better Approaches:
${toBulletList(improvements)}
`;

const localSection = `
### ${timestamp}
Summary: ${summary || "(not provided)"}
Local Lessons:
${toBulletList(localLessons)}
Mistakes To Avoid:
${toBulletList(mistakes)}
Better Approaches:
${toBulletList(improvements)}
`;

appendSection(globalCodexPath, globalSection);
appendSection(localCodexPath, localSection);

console.log("Updated:");
console.log(`- ${globalCodexPath}`);
console.log(`- ${localCodexPath}`);
