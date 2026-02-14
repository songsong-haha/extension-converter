#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent-name> [task-slug] [base-branch] [task-template]" >&2
  echo "Example: $0 frontend hero-redesign main ga" >&2
  exit 1
fi

AGENT_NAME="$1"
TASK_SLUG="${2:-general}"
BASE_BRANCH="${3:-main}"
TASK_TEMPLATE_NAME="${4:-default}"

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
TASK_CARD_PATH="$METADATA_DIR/${AGENT_NAME}-${TASK_SLUG}.md"
DEFAULT_TASK_CARD_TEMPLATE="$METADATA_DIR/templates/agent-task-template.md"
if [[ "$TASK_TEMPLATE_NAME" == "default" ]]; then
  TASK_CARD_TEMPLATE="$DEFAULT_TASK_CARD_TEMPLATE"
else
  TASK_CARD_TEMPLATE="$METADATA_DIR/templates/${TASK_TEMPLATE_NAME}-agent-task-template.md"
fi

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

if [[ -f "$TASK_CARD_TEMPLATE" ]]; then
  sed \
    -e "s|{{AGENT_NAME}}|$AGENT_NAME|g" \
    -e "s|{{TASK_SLUG}}|$TASK_SLUG|g" \
    -e "s|{{AGENT_BRANCH}}|$AGENT_BRANCH|g" \
    -e "s|{{WORKTREE_PATH}}|.worktrees/${AGENT_NAME}-${TASK_SLUG}|g" \
    "$TASK_CARD_TEMPLATE" > "$TASK_CARD_PATH"
elif [[ -f "$DEFAULT_TASK_CARD_TEMPLATE" ]]; then
  sed \
    -e "s|{{AGENT_NAME}}|$AGENT_NAME|g" \
    -e "s|{{TASK_SLUG}}|$TASK_SLUG|g" \
    -e "s|{{AGENT_BRANCH}}|$AGENT_BRANCH|g" \
    -e "s|{{WORKTREE_PATH}}|.worktrees/${AGENT_NAME}-${TASK_SLUG}|g" \
    "$DEFAULT_TASK_CARD_TEMPLATE" > "$TASK_CARD_PATH"
  echo "Warning: template '$TASK_TEMPLATE_NAME' not found. Used default template." >&2
fi

echo "Created agent worktree"
echo "- branch:   $AGENT_BRANCH"
echo "- worktree: $WORKTREE_PATH"
echo "- metadata: $METADATA_PATH"
if [[ -f "$TASK_CARD_PATH" ]]; then
  echo "- taskcard: $TASK_CARD_PATH"
fi
