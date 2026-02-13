#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <task-slug> [base-branch]" >&2
  echo "Example: $0 hero-copy-a-b main" >&2
  exit 1
fi

TASK_SLUG="$1"
BASE_BRANCH="${2:-main}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
CREATE_SCRIPT="$REPO_ROOT/scripts/worktree/create-agent.sh"

if [[ ! -x "$CREATE_SCRIPT" ]]; then
  echo "Error: create-agent.sh not found or not executable" >&2
  exit 1
fi

echo "[growth-loop] creating implementation worktree"
bash "$CREATE_SCRIPT" growth "$TASK_SLUG" "$BASE_BRANCH" default

echo "[growth-loop] creating mandatory QA worktree"
bash "$CREATE_SCRIPT" qa "$TASK_SLUG" "$BASE_BRANCH" default

echo "[growth-loop] created two worktrees for small-task loop"
echo "- implementer: agent/growth/$TASK_SLUG"
echo "- reviewer:    agent/qa/$TASK_SLUG"
