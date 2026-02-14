#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required" >&2
  exit 1
fi

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-name> <task-slug> [--delete-branch]" >&2
  exit 1
fi

AGENT_NAME="$1"
TASK_SLUG="$2"
DELETE_BRANCH="${3:-}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_PATH="$REPO_ROOT/.worktrees/${AGENT_NAME}-${TASK_SLUG}"
METADATA_PATH="$REPO_ROOT/.agents/${AGENT_NAME}-${TASK_SLUG}.json"
TASK_CARD_PATH="$REPO_ROOT/.agents/${AGENT_NAME}-${TASK_SLUG}.md"
BRANCH="agent/${AGENT_NAME}/${TASK_SLUG}"

if [[ ! -d "$WORKTREE_PATH" ]]; then
  echo "Error: worktree not found: $WORKTREE_PATH" >&2
  exit 1
fi

git worktree remove "$WORKTREE_PATH"
rm -f "$METADATA_PATH"
rm -f "$TASK_CARD_PATH"

git worktree prune

if [[ "$DELETE_BRANCH" == "--delete-branch" ]]; then
  if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    git branch -D "$BRANCH"
    echo "Deleted branch: $BRANCH"
  fi
fi

echo "Removed agent worktree: ${AGENT_NAME}-${TASK_SLUG}"
