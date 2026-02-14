#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
METADATA_DIR="$REPO_ROOT/.agents"

echo "== Git Worktrees =="
git worktree list

echo
echo "== Agent Metadata =="
if [[ -d "$METADATA_DIR" ]]; then
  ls -1 "$METADATA_DIR"/*.json "$METADATA_DIR"/*.md 2>/dev/null || echo "(none)"
else
  echo "(none)"
fi
