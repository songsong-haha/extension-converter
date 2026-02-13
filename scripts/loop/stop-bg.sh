#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="$REPO_ROOT/loop/runner.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "[loop-bg] no pid file"
  exit 0
fi

PID="$(cat "$PID_FILE" || true)"
if [[ -z "${PID:-}" ]]; then
  rm -f "$PID_FILE"
  echo "[loop-bg] pid file was empty"
  exit 0
fi

if ps -p "$PID" >/dev/null 2>&1; then
  kill "$PID"
  echo "[loop-bg] stopped pid=$PID"
else
  echo "[loop-bg] process not running pid=$PID"
fi

rm -f "$PID_FILE"
