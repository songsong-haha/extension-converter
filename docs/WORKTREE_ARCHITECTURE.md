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
- Agent branches are short-lived and merged through PRs or local review.

## Lifecycle

1. Create an isolated worktree for an agent task.
2. Run development/tests inside that worktree.
3. Commit on the agent branch.
4. Merge back to `main` after review.
5. Remove worktree and metadata.

## Commands

```bash
pnpm agent:create <agent-name> <task-slug> [base-branch] [task-template]
pnpm agent:list
pnpm agent:remove <agent-name> <task-slug>
pnpm agent:remove:branch <agent-name> <task-slug>
```

## Example

```bash
pnpm agent:create converter parser-refactor main
cd .worktrees/converter-parser-refactor
pnpm install
pnpm lint
# implement + commit
cd ../..
pnpm agent:list
pnpm agent:remove converter parser-refactor

# GA 템플릿 사용 예시
pnpm agent:create analytics ga-instrumentation main ga
```

## Operational Rules

- Never share one branch across agents.
- Keep one task per agent branch.
- Rebase or merge `main` into long-running agent branches regularly.
- Keep `.worktrees/` out of commits.
- Track each active task with metadata in `.agents/*.json`.
