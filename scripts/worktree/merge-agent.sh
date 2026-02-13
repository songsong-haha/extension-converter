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
  echo "Error: mandatory QA branch missing: $QA_BRANCH" >&2
  echo "Create QA worktree first: npm run agent:task:start -- $TASK_SLUG $TARGET_BRANCH" >&2
  exit 1
fi

echo "[merge-gate] running mandatory QA gate before merge"
npm run qa:gate

echo "[merge-gate] switching to target branch: $TARGET_BRANCH"
git checkout "$TARGET_BRANCH"

echo "[merge-gate] merging $SOURCE_BRANCH"
git merge --no-ff "$SOURCE_BRANCH" -m "merge: $SOURCE_BRANCH"

echo "[merge-gate] merged successfully."
echo "[merge-gate] QA branch retained for follow-up verification: $QA_BRANCH"
