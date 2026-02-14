#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const mandatory = [
  [
    "npm",
    [
      "run",
      "lint",
      "--",
      "--ignore-pattern",
      ".worktrees/**",
      "--ignore-pattern",
      "loop/tmp-worktrees/**",
      "--ignore-pattern",
      "**/.next/**",
    ],
  ],
  ["npm", ["run", "build"]],
  ["npx", ["-y", "playwright@1.56.0", "install", "--with-deps", "chromium"]],
  ["npm", ["run", "test:e2e"]],
];

console.log("[qa-gate] lint ignores: .worktrees/**, loop/tmp-worktrees/**, **/.next/**");

for (const [cmd, args] of mandatory) {
  const label = `${cmd} ${args.join(" ")}`;
  console.log(`\n[qa-gate] running: ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\n[qa-gate] failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n[qa-gate] mandatory QA passed");

console.log("\n[qa-gate] running non-blocking AI QA report");
const ai = spawnSync("npm", ["run", "qa:ai"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

if (ai.status !== 0) {
  console.warn("[qa-gate] AI QA failed but merge gate remains green (non-blocking)");
}
