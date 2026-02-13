#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-name> <task-slug> [target-branch]" >&2
  echo "Example: $0 growth hero-copy-a-b main" >&2
  exit 1
fi

AGENT_NAME="$1"
TASK_SLUG="$2"
TARGET_BRANCH="${3:-main}"
SOURCE_BRANCH="agent/${AGENT_NAME}/${TASK_SLUG}"
QA_BRANCH="agent/qa/${TASK_SLUG}"

if ! git rev-parse --verify "$SOURCE_BRANCH" >/dev/null 2>&1; then
  echo "Error: source branch not found: $SOURCE_BRANCH" >&2
  exit 1
fi

if ! git rev-parse --verify "$QA_BRANCH" >/dev/null 2>&1; then
  echo "Error: mandatory QA branch not found: $QA_BRANCH" >&2
  exit 1
fi

echo "[auto-promote] pushing agent branches"
git push -u origin "$SOURCE_BRANCH"
git push -u origin "$QA_BRANCH"

echo "[auto-promote] running merge gate"
bash scripts/worktree/merge-agent.sh "$AGENT_NAME" "$TASK_SLUG" "$TARGET_BRANCH"

echo "[auto-promote] pushing merged target branch"
git push origin "$TARGET_BRANCH"

echo "[auto-promote] removing local worktrees and local branches"
bash scripts/worktree/remove-agent.sh "$AGENT_NAME" "$TASK_SLUG" --delete-branch
bash scripts/worktree/remove-agent.sh qa "$TASK_SLUG" --delete-branch

echo "[auto-promote] removing remote agent branches (non-blocking)"
set +e
git push origin ":$SOURCE_BRANCH" ":$QA_BRANCH"
REMOTE_DELETE_STATUS=$?
set -e

if [[ $REMOTE_DELETE_STATUS -ne 0 ]]; then
  echo "[auto-promote] warning: remote branch deletion skipped/failed. delete manually if needed."
fi

echo "[auto-promote] completed for task: $TASK_SLUG"
