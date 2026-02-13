#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOOP_DIR="$REPO_ROOT/loop"
PID_FILE="$LOOP_DIR/runner.pid"
LOG_FILE="$LOOP_DIR/runner.log"

mkdir -p "$LOOP_DIR"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "${PID:-}" ]] && ps -p "$PID" >/dev/null 2>&1; then
    echo "[loop-bg] already running: pid=$PID"
    exit 0
  fi
fi

nohup /bin/bash "$REPO_ROOT/scripts/loop/codex-loop.sh" "$@" >> "$LOG_FILE" 2>&1 &
echo "$!" > "$PID_FILE"
echo "[loop-bg] started: pid=$(cat "$PID_FILE")"
