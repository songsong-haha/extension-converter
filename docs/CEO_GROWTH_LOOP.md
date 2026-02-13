# CEO Growth Loop (Small Tasks + Mandatory QA)

## Objective
Increase visitors and ad revenue through repeated micro-improvements with strict quality control.

## Non-Stop Rule
A chat session cannot literally run forever, but automation can.
Use `.github/workflows/growth-loop.yml` to run the loop every 6 hours.

## Team Rule (QA Mandatory)
Every task must include:
- `growth` agent branch: implementation
- `qa` agent branch: verification

Start a task:

```bash
npm run agent:task:start -- <task-slug> [base-branch]
```

This always creates two worktrees (`growth` and `qa`) for the same task.

## Merge Rule (Test Pass Required)
Never merge directly.
Use merge gate command:

```bash
npm run agent:merge -- <agent-name> <task-slug> [target-branch]
```

The gate enforces:
- `npm run lint`
- `npm run build`
- `npm run test:e2e` (Playwright)

If any check fails, merge is blocked.

## AI QA Rule
Run:

```bash
npm run qa:ai
```

Generated report:
- `test-results/ai-qa/report.md`

If `OPENAI_API_KEY` exists, AI recommendations are included.
Without it, heuristic QA report is still generated.

## Suggested Micro-Loop
1. Pick one unchecked task from `docs/GROWTH_BACKLOG.md`.
2. Create growth+qa worktrees for that task.
3. Implement only one small change and add/update tests.
4. QA agent validates locally and in Playwright.
5. Merge only through QA gate.
6. Mark task done and move to next one.
