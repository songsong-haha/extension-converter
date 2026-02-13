#!/usr/bin/env bash
set -euo pipefail

LABEL="${LOOP_LABEL:-com.extensionconverter.codex.loop}"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

echo "[loop-launchd] label: $LABEL"
if [[ -f "$PLIST_PATH" ]]; then
  echo "[loop-launchd] plist exists: $PLIST_PATH"
else
  echo "[loop-launchd] plist missing: $PLIST_PATH"
fi

echo "[loop-launchd] launchctl print summary:"
if ! launchctl print "gui/$(id -u)/$LABEL" 2>/dev/null | sed -n '1,80p'; then
  echo "(not loaded)"
fi
