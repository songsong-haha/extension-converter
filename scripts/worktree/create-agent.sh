#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent-name> [task-slug] [base-branch]" >&2
  echo "Example: $0 frontend hero-redesign main" >&2
  exit 1
fi

AGENT_NAME="$1"
TASK_SLUG="${2:-general}"
BASE_BRANCH="${3:-main}"

if [[ ! "$AGENT_NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "Error: agent-name may only contain letters, numbers, ., _, -" >&2
  exit 1
fi

if [[ ! "$TASK_SLUG" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "Error: task-slug may only contain letters, numbers, ., _, -" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_ROOT="$REPO_ROOT/.worktrees"
METADATA_DIR="$REPO_ROOT/.agents"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

AGENT_BRANCH="agent/${AGENT_NAME}/${TASK_SLUG}"
WORKTREE_PATH="$WORKTREE_ROOT/${AGENT_NAME}-${TASK_SLUG}"
METADATA_PATH="$METADATA_DIR/${AGENT_NAME}-${TASK_SLUG}.json"

mkdir -p "$WORKTREE_ROOT" "$METADATA_DIR"

if [[ -e "$WORKTREE_PATH" ]]; then
  echo "Error: worktree path already exists: $WORKTREE_PATH" >&2
  exit 1
fi

if ! git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  if ! git rev-parse --verify "origin/$BASE_BRANCH" >/dev/null 2>&1; then
    echo "Error: base branch '$BASE_BRANCH' not found locally or on origin" >&2
    exit 1
  fi
fi

if git rev-parse --verify "$AGENT_BRANCH" >/dev/null 2>&1; then
  git worktree add "$WORKTREE_PATH" "$AGENT_BRANCH"
else
  git worktree add -b "$AGENT_BRANCH" "$WORKTREE_PATH" "$BASE_BRANCH"
fi

cat > "$METADATA_PATH" <<JSON
{
  "agent": "$AGENT_NAME",
  "task": "$TASK_SLUG",
  "branch": "$AGENT_BRANCH",
  "base": "$BASE_BRANCH",
  "worktree": ".worktrees/${AGENT_NAME}-${TASK_SLUG}",
  "created_at_utc": "$TIMESTAMP"
}
JSON

echo "Created agent worktree"
echo "- branch:   $AGENT_BRANCH"
echo "- worktree: $WORKTREE_PATH"
echo "- metadata: $METADATA_PATH"
