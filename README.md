This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Google Analytics (GA4)

Set your GA measurement ID:

```bash
echo 'NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX' >> .env.local
```

The app will automatically:

- load GA script only when the env var exists
- send `page_view` on route changes
- send conversion funnel events from the converter widget

See `docs/GA_AGENT_WORKFLOW.md` for event catalog and validation checklist.

## Agent Workflow

This repo supports parallel work using Git worktrees.

```bash
npm run agent:create -- <agent-name> <task-slug> [base-branch] [task-template]
npm run agent:list
npm run agent:remove -- <agent-name> <task-slug>
```

GA task example:

```bash
npm run agent:create -- analytics event-conversion main ga
```

This command creates:

- `.worktrees/<agent>-<task>/` worktree
- `.agents/<agent>-<task>.json` metadata
- `.agents/<agent>-<task>.md` task card (from template)

## Continuous Growth Loop

Use a small-task loop with mandatory QA branch:

```bash
npm run agent:task:start -- <task-slug> [base-branch]
```

Start up to 3 full core-team task lanes at once from backlog:

```bash
npm run agent:teams:start -- 3 main
```

Merge only via QA gate (lint + build + Playwright pass required):

```bash
npm run agent:merge -- <agent-name> <task-slug> [target-branch]
```

Generate AI QA report:

```bash
npm run qa:ai
```

Track loop status dashboard:

```bash
npm run growth:track
```

See `docs/CEO_GROWTH_LOOP.md` and `docs/GROWTH_BACKLOG.md`.
For continuous auto-promote operation, see `docs/LOOP_AUTOPROMOTE_RUNBOOK.md`.

## Ralph-style Infinite Loop Setup

This repo now includes a `ralph`-style autonomous loop driven by `codex exec`.

Initialize editable PRD:

```bash
cp loop/prd.json.example loop/prd.json
```

Run one iteration:

```bash
pnpm loop:run:once
```

Run forever:

```bash
pnpm loop:run
```

Run forever + auto promote on completion:

```bash
pnpm loop:run:auto-promote
```

Run in background:

```bash
nohup pnpm loop:run > loop/runner.log 2>&1 &
```

Background control scripts:

```bash
npm run loop:bg:start
npm run loop:bg:start:auto-promote
npm run loop:bg:status
npm run loop:bg:stop
```

Completion behavior in background supervisor:
- when the agent prints `<promise>COMPLETE</promise>`, the current PRD cycle is treated as done
- the supervisor checks backlog continuity and starts the next cycle instead of stopping
- stop explicitly with `npm run loop:bg:stop`

One-shot promote flow after agent commit:

```bash
npm run agent:auto-promote -- growth <task-slug> [target-branch]
```

This performs:
- push `agent/growth/<task-slug>`
- push `agent/ceo/<task-slug>`
- push `agent/qa/<task-slug>`
- push `agent/analytics/<task-slug>`
- push `agent/designer/<task-slug>`
- run merge gate (`lint`, `build`, `test:e2e`, `qa:ai`)
- merge into target branch
- push target branch
- remove local core-team worktrees + local branches
- try remote branch deletion (non-blocking)

macOS auto-restart with `launchd`:

```bash
pnpm loop:daemon:install
pnpm loop:daemon:status
```

Stop and remove daemon:

```bash
pnpm loop:daemon:uninstall
```

Remove worktree + branch directly:

```bash
npm run agent:remove:branch -- <agent-name> <task-slug> --delete-branch
```

If the repo is under `~/Documents`, macOS may block launchd from reading the working directory.
In that case, use `loop:bg:*` commands or move the repo to a non-protected path like `~/dev`.

Main files:

- `scripts/loop/codex-loop.mjs`: infinite loop runner
- `scripts/worktree/*.mjs`: worktree + merge/auto-promote automation
- `loop/prompt.md`: per-iteration agent instructions
- `loop/prd.json`: active plan (created from example)
- `loop/progress.txt`: cumulative iteration log

## Codex Compact Memory

Before context compact, write lessons into both global/local memory in one command:

```bash
pnpm codex:precompact -- \
  --summary "implemented X and validated Y" \
  --mistakes "forgot edge case A|used wrong command B" \
  --improvements "add guard for A first|run command C before merge" \
  --global "always validate assumptions against source of truth" \
  --local "for converter flows, update format-registry before UI wiring"
```

Files updated by the command:

- `~/.codex/codex.md` (global reusable lessons)
- `codex.md` (project-local lessons for this repo)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
