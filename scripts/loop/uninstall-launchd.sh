#!/usr/bin/env bash
set -euo pipefail

LABEL="${LOOP_LABEL:-com.extensionconverter.codex.loop}"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl disable "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true

if [[ -f "$PLIST_PATH" ]]; then
  rm -f "$PLIST_PATH"
fi

echo "[loop-launchd] uninstalled: $LABEL"
