#!/usr/bin/env bash
set -euo pipefail

LABEL="${LOOP_LABEL:-com.extensionconverter.codex.loop}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"
LOOP_DIR="$REPO_ROOT/loop"
OUT_LOG="$LOOP_DIR/runner.log"
ERR_LOG="$LOOP_DIR/runner.error.log"

CODEX_BIN="$(command -v codex || true)"
ZSH_BIN="$(command -v zsh || true)"

if [[ -z "$CODEX_BIN" || -z "$ZSH_BIN" ]]; then
  echo "[loop-launchd] missing required binaries (codex/zsh)" >&2
  exit 1
fi

mkdir -p "$PLIST_DIR" "$LOOP_DIR"

if [[ ! -f "$LOOP_DIR/prd.json" && -f "$LOOP_DIR/prd.json.example" ]]; then
  cp "$LOOP_DIR/prd.json.example" "$LOOP_DIR/prd.json"
  echo "[loop-launchd] initialized loop/prd.json from example"
fi

PATH_DIRS=(
  "$(dirname "$CODEX_BIN")"
  "/usr/local/bin"
  "/opt/homebrew/bin"
  "/usr/bin"
  "/bin"
  "/usr/sbin"
  "/sbin"
)

build_path() {
  local seen path_out dir
  seen=":"
  path_out=""
  for dir in "${PATH_DIRS[@]}"; do
    [[ -z "$dir" ]] && continue
    if [[ "$seen" != *":$dir:"* ]]; then
      seen="${seen}${dir}:"
      if [[ -z "$path_out" ]]; then
        path_out="$dir"
      else
        path_out="${path_out}:$dir"
      fi
    fi
  done
  printf "%s" "$path_out"
}

PATH_VALUE="$(build_path)"
RUN_CMD="cd \"$REPO_ROOT\" && /bin/bash \"$REPO_ROOT/scripts/loop/codex-loop.sh\""

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$ZSH_BIN</string>
    <string>-lc</string>
    <string>$RUN_CMD</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO_ROOT</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$PATH_VALUE</string>
  </dict>
  <key>StandardOutPath</key>
  <string>$OUT_LOG</string>
  <key>StandardErrorPath</key>
  <string>$ERR_LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "[loop-launchd] installed and started: $LABEL"
echo "[loop-launchd] plist: $PLIST_PATH"
echo "[loop-launchd] logs: $OUT_LOG / $ERR_LOG"
