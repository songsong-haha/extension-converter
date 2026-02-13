# Worktree Architecture for Many Agents

This repository is configured for parallel agent execution using Git worktrees.

## Directory Structure

- `.`: Integration worktree (main coordination branch)
- `.worktrees/`: Per-agent worktree checkouts
- `.agents/`: Agent metadata and task cards
- `scripts/worktree/`: Automation scripts for provisioning and cleanup

## Branching Model

- Integration branch: `main`
- Agent branch pattern: `agent/<agent-name>/<task-slug>`
- Mandatory core-team agents per task:
  - `agent/ceo/<task-slug>`
  - `agent/growth/<task-slug>`
  - `agent/qa/<task-slug>`
  - `agent/analytics/<task-slug>`
  - `agent/designer/<task-slug>`
- Agent branches are short-lived and merged through merge-gate + auto-promote.

## Lifecycle

1. Create mandatory core-team worktrees for one task slug.
2. Run implementation + validation in each role branch.
3. Commit on the task branch(es).
4. Run merge-gate/auto-promote to merge to `main`.
5. Remove task worktrees and metadata.

## Commands

```bash
npm run agent:task:start -- <task-slug> [base-branch]
npm run agent:teams:start -- 3 main
npm run agent:merge -- <agent-name> <task-slug> [target-branch]
npm run agent:auto-promote -- growth <task-slug> [target-branch]
npm run agent:list
npm run agent:remove -- <agent-name> <task-slug>
npm run agent:remove:branch -- <agent-name> <task-slug> --delete-branch
```

## Example

```bash
npm run agent:task:start -- parser-refactor main
cd .worktrees/growth-parser-refactor
npm install
npm run lint
# implement + commit
cd ../..
npm run agent:merge -- growth parser-refactor main
npm run agent:auto-promote -- growth parser-refactor main
npm run agent:list
```

## Operational Rules

- Never share one branch across agents.
- Keep one task per agent branch.
- Rebase or merge `main` into long-running agent branches regularly.
- Keep `.worktrees/` out of commits.
- Track each active task with metadata in `.agents/*.json`.
- Worktree automation scripts are Node.js files under `scripts/worktree/*.mjs`.
