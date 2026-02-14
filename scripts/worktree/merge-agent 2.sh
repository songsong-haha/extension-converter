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
  echo "[merge-gate] target branch policy enforced: requested '$TARGET_BRANCH' -> using 'main'"
  TARGET_BRANCH="main"
fi

if ! git rev-parse --verify "$SOURCE_BRANCH" >/dev/null 2>&1; then
  echo "Error: source branch not found: $SOURCE_BRANCH" >&2
  exit 1
fi

for branch in "$CEO_BRANCH" "$GROWTH_BRANCH" "$QA_BRANCH" "$ANALYTICS_BRANCH"; do
  if ! git rev-parse --verify "$branch" >/dev/null 2>&1; then
    echo "Error: mandatory core-team branch missing: $branch" >&2
    echo "Create core-team worktrees first: npm run agent:task:start -- $TASK_SLUG main" >&2
    exit 1
  fi
done

echo "[merge-gate] running mandatory QA gate before merge"
npm run qa:gate

echo "[merge-gate] switching to target branch: $TARGET_BRANCH"
git checkout "$TARGET_BRANCH"

echo "[merge-gate] merging $SOURCE_BRANCH"
git merge --no-ff "$SOURCE_BRANCH" -m "merge: $SOURCE_BRANCH"

echo "[merge-gate] pushing merged target branch: $TARGET_BRANCH"
git push origin "$TARGET_BRANCH"

echo "[merge-gate] merged successfully."
echo "[merge-gate] core-team branches retained for follow-up verification:"
echo "- $CEO_BRANCH"
echo "- $GROWTH_BRANCH"
echo "- $QA_BRANCH"
echo "- $ANALYTICS_BRANCH"
