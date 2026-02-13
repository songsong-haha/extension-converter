import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function runSeedScript(env) {
  return spawnSync("node", ["scripts/worktree/seed-prd-from-backlog.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("seeds prd from first open backlog item when current prd has no pending story", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prd-seed-"));
  const backlogPath = path.join(tempDir, "backlog.md");
  const prdPath = path.join(tempDir, "prd.json");

  fs.writeFileSync(
    backlogPath,
    [
      "# Backlog",
      "- [ ] `hero-copy-a-b` | Hero 카피 A/B 문구 1개 추가 | metric: CTA click rate | owner: growth+qa",
      "- [ ] `faq-snippet-seo` | FAQ 섹션 추가 | metric: organic impressions | owner: growth+qa",
      "",
    ].join("\n"),
    "utf8",
  );

  fs.writeFileSync(
    prdPath,
    `${JSON.stringify({
      project: "extension-converter",
      branchName: "agent/growth/old-task",
      description: "done",
      userStories: [
        { id: "US-001", title: "old", passes: true },
        { id: "US-002", title: "old2", passes: true },
      ],
    }, null, 2)}\n`,
    "utf8",
  );

  const result = runSeedScript({
    LOOP_BACKLOG_PATH: backlogPath,
    LOOP_PRD_PATH: prdPath,
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /seeded PRD from backlog ticket: hero-copy-a-b/);

  const nextPrd = JSON.parse(fs.readFileSync(prdPath, "utf8"));
  assert.equal(nextPrd.branchName, "agent/growth/hero-copy-a-b");
  assert.equal(nextPrd.userStories.length, 1);
  assert.equal(nextPrd.userStories[0].passes, false);

  const updatedBacklog = fs.readFileSync(backlogPath, "utf8");
  assert.match(updatedBacklog, /- \[x\] `hero-copy-a-b`/);
  assert.match(updatedBacklog, /- \[ \] `faq-snippet-seo`/);
});

test("keeps prd unchanged when pending story already exists", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prd-seed-"));
  const backlogPath = path.join(tempDir, "backlog.md");
  const prdPath = path.join(tempDir, "prd.json");

  fs.writeFileSync(
    backlogPath,
    "- [ ] `hero-copy-a-b` | Hero 카피 A/B 문구 1개 추가 | metric: CTA click rate | owner: growth+qa\n",
    "utf8",
  );

  const originalPrd = {
    project: "extension-converter",
    branchName: "agent/growth/in-progress",
    userStories: [{ id: "US-001", title: "in progress", passes: false }],
  };
  fs.writeFileSync(prdPath, `${JSON.stringify(originalPrd, null, 2)}\n`, "utf8");

  const result = runSeedScript({
    LOOP_BACKLOG_PATH: backlogPath,
    LOOP_PRD_PATH: prdPath,
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /pending story exists; no reseed/);

  const nextPrd = JSON.parse(fs.readFileSync(prdPath, "utf8"));
  assert.deepEqual(nextPrd, originalPrd);
});
