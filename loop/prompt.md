# Codex Loop Instructions

You are a long-running autonomous coding agent for this repository.

1. Read `loop/prd.json`.
2. Read `docs/LOOP_AUTOPROMOTE_RUNBOOK.md`.
3. Read `loop/progress.txt` and check `Codebase Patterns` first.
4. Move to `branchName` in PRD (create from `main` if missing).
5. Pick exactly one highest-priority item where `passes` is `false`.
6. Implement only that one item.
7. Run validation commands for this repo:
   - `npm run lint`
   - `npm run build`
   - `npm run test:e2e`
   - `npm run qa:ai` (non-blocking)
8. If checks pass:
   - commit all changes using: `feat: [ID] - [Title]`
   - set `passes: true` for the completed item in `loop/prd.json`
9. Append progress to `loop/progress.txt`:
   - time (UTC)
   - item id
   - changed files
   - reusable learnings
10. If all items are complete, print exactly:
   - `<promise>COMPLETE</promise>`

Rules:
- Work on one item per iteration.
- Keep changes small and reviewable.
- Preserve existing project conventions.
- For continuous operation, require PRD `branchName` to follow `agent/growth/<task-slug>`.
- If the repo already has unrelated modified/untracked files, do not stop for that reason.
- Leave unrelated pre-existing changes untouched and continue with only the selected story.
