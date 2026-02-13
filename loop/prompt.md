# Codex Loop Instructions

You are a long-running autonomous coding agent for this repository.

1. Read `loop/prd.json`.
2. Read `docs/LOOP_AUTOPROMOTE_RUNBOOK.md`.
3. Read `loop/progress.txt` and check `Codebase Patterns` first.
4. Ensure backlog continuity before implementation:
   - run `node /Users/song-eun-u/Documents/github/extension-converter/scripts/worktree/ensure-backlog-item.mjs`
   - keep at least five open tickets; if fewer than five, top up from `project-report.md`
5. Move to `branchName` in PRD (create from `main` if missing).
6. Pick exactly one highest-priority item where `passes` is `false`.
7. Implement only that one item.
8. Run validation commands for this repo:
   - `npm run lint`
   - `npm run build`
   - `npm run test:e2e`
   - `npm run qa:ai` (non-blocking)
9. If checks pass:
   - commit all changes using: `feat: [ID] - [Title]`
   - set `passes: true` for the completed item in `loop/prd.json`
   - do not run merge/auto-promote directly; loop orchestrator will handle promotion
10. Append progress to `loop/progress.txt`:
   - time (UTC)
   - item id
   - changed files
   - reusable learnings
11. If all items are complete, print exactly:
   - `<promise>COMPLETE</promise>`

Rules:
- Work on one item per iteration.
- Keep changes small and reviewable.
- The supervisor will treat `<promise>COMPLETE</promise>` as "current PRD finished" and start the next loop cycle.
- Ticket size policy: excluding tests/lint/build, implementation work should be at least 10 minutes.
- If a selected item is bigger than ~30 minutes of implementation effort, split it into smaller sub-tasks before coding.
- Preserve existing project conventions.
- For continuous operation, require PRD `branchName` to follow `agent/growth/<task-slug>`.
- Mandatory core-team branches must exist for each task:
  - `agent/ceo/<task-slug>`
  - `agent/growth/<task-slug>`
  - `agent/qa/<task-slug>`
  - `agent/analytics/<task-slug>`
  - `agent/designer/<task-slug>`
- Worktrees must always start from `main`, and every completed task must be merged into and pushed to `main` immediately.
- If target task branch already exists, update it with latest `origin/main` before implementation (rebase or merge).
- Do not create ad-hoc external worktrees outside `/Users/song-eun-u/Documents/github/extension-converter/.worktrees`.
- If running from a worktree, execute loop helper scripts using absolute path under `/Users/song-eun-u/Documents/github/extension-converter/scripts/...` (not worktree-relative scripts path).
- Agent execution scope ends at implementation + validation + commit + PRD/progress update.
- Promotion (`auto-promote`, merge to `main`, branch cleanup) is orchestrator-only in `scripts/loop/codex-loop.mjs`.
- If the repo already has unrelated modified/untracked files, do not stop for that reason.
- Leave unrelated pre-existing changes untouched and continue with only the selected story.
