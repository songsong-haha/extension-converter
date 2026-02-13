#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$REPO_ROOT/loop/runner.pid"
LOG_FILE="$REPO_ROOT/loop/runner.log"

if [[ ! -f "$PID_FILE" ]]; then
  echo "[loop-bg] not running (no pid file)"
  exit 0
fi

PID="$(cat "$PID_FILE" || true)"
if [[ -z "${PID:-}" ]]; then
  echo "[loop-bg] not running (empty pid file)"
  exit 0
fi

if ps -p "$PID" >/dev/null 2>&1; then
  echo "[loop-bg] running pid=$PID"
else
  echo "[loop-bg] not running (stale pid=$PID)"
fi

if [[ -f "$LOG_FILE" ]]; then
  echo "[loop-bg] log tail:"
  tail -n 20 "$LOG_FILE"
fi
