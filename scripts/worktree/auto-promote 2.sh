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
CEO_BRANCH="agent/ceo/${TASK_SLUG}"
GROWTH_BRANCH="agent/growth/${TASK_SLUG}"
QA_BRANCH="agent/qa/${TASK_SLUG}"
ANALYTICS_BRANCH="agent/analytics/${TASK_SLUG}"

if [[ "$TARGET_BRANCH" != "main" ]]; then
  echo "[auto-promote] target branch policy enforced: requested '$TARGET_BRANCH' -> using 'main'"
  TARGET_BRANCH="main"
fi

if ! git rev-parse --verify "$SOURCE_BRANCH" >/dev/null 2>&1; then
  echo "Error: source branch not found: $SOURCE_BRANCH" >&2
  exit 1
fi

for branch in "$CEO_BRANCH" "$GROWTH_BRANCH" "$QA_BRANCH" "$ANALYTICS_BRANCH"; do
  if ! git rev-parse --verify "$branch" >/dev/null 2>&1; then
    echo "Error: mandatory core-team branch not found: $branch" >&2
    exit 1
  fi
done

echo "[auto-promote] pushing core-team branches"
git push -u origin "$CEO_BRANCH"
git push -u origin "$GROWTH_BRANCH"
git push -u origin "$QA_BRANCH"
git push -u origin "$ANALYTICS_BRANCH"

echo "[auto-promote] running merge gate"
bash scripts/worktree/merge-agent.sh "$AGENT_NAME" "$TASK_SLUG" "$TARGET_BRANCH"

echo "[auto-promote] removing local worktrees and local branches"
bash scripts/worktree/remove-agent.sh "$AGENT_NAME" "$TASK_SLUG" --delete-branch
if [[ "$AGENT_NAME" != "ceo" ]]; then
  bash scripts/worktree/remove-agent.sh ceo "$TASK_SLUG" --delete-branch
fi
if [[ "$AGENT_NAME" != "growth" ]]; then
  bash scripts/worktree/remove-agent.sh growth "$TASK_SLUG" --delete-branch
fi
if [[ "$AGENT_NAME" != "qa" ]]; then
  bash scripts/worktree/remove-agent.sh qa "$TASK_SLUG" --delete-branch
fi
if [[ "$AGENT_NAME" != "analytics" ]]; then
  bash scripts/worktree/remove-agent.sh analytics "$TASK_SLUG" --delete-branch
fi

echo "[auto-promote] removing remote agent branches (non-blocking)"
set +e
git push origin ":$SOURCE_BRANCH" ":$CEO_BRANCH" ":$GROWTH_BRANCH" ":$QA_BRANCH" ":$ANALYTICS_BRANCH"
REMOTE_DELETE_STATUS=$?
set -e

if [[ $REMOTE_DELETE_STATUS -ne 0 ]]; then
  echo "[auto-promote] warning: remote branch deletion skipped/failed. delete manually if needed."
fi

echo "[auto-promote] completed for task: $TASK_SLUG"
