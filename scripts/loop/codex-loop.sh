#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOOP_DIR="$REPO_ROOT/loop"
PROMPT_FILE="$LOOP_DIR/prompt.md"
PRD_FILE="$LOOP_DIR/prd.json"
PRD_EXAMPLE_FILE="$LOOP_DIR/prd.json.example"
PROGRESS_FILE="$LOOP_DIR/progress.txt"
ARCHIVE_DIR="$LOOP_DIR/archive"
LAST_BRANCH_FILE="$LOOP_DIR/.last-branch"

MAX_ITERATIONS=0
SLEEP_SECONDS=3
MODEL="${CODEX_MODEL:-}"
COMPLETION_TOKEN="<promise>COMPLETE</promise>"
AUTO_PROMOTE=0

usage() {
  cat <<'EOF'
Usage:
  bash scripts/loop/codex-loop.sh [options]

Options:
  --max-iterations <n>   0 means infinite (default: 0)
  --sleep-seconds <n>    seconds between iterations (default: 3)
  --model <name>         codex model override (optional)
  --completion-token <t> loop stops if output includes this token
  --auto-promote        if PRD branch is agent/growth/<task>, run auto-promote flow
  -h, --help             show help
EOF
}

ensure_loop_files() {
  mkdir -p "$LOOP_DIR" "$ARCHIVE_DIR"

  if [[ ! -f "$PRD_FILE" ]]; then
    if [[ -f "$PRD_EXAMPLE_FILE" ]]; then
      cp "$PRD_EXAMPLE_FILE" "$PRD_FILE"
      echo "[loop] initialized $PRD_FILE from example"
    else
      echo "[loop] missing $PRD_FILE and $PRD_EXAMPLE_FILE" >&2
      exit 1
    fi
  fi

  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "[loop] missing $PROMPT_FILE" >&2
    exit 1
  fi

  if [[ ! -f "$PROGRESS_FILE" ]]; then
    local started_at
    started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    cat > "$PROGRESS_FILE" <<EOF
# Loop Progress Log

## Codebase Patterns
- Run `pnpm qa:gate` before merge when behavior changed.

---
Started: $started_at
EOF
  fi
}

get_prd_branch_name() {
  node -e '
const fs = require("node:fs");
const path = process.argv[1];
try {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  process.stdout.write(typeof raw.branchName === "string" ? raw.branchName : "");
} catch {
  process.stdout.write("");
}
' "$PRD_FILE"
}

archive_if_branch_changed() {
  local current_branch last_branch date_stamp folder_name target
  current_branch="$(get_prd_branch_name)"

  if [[ -f "$LAST_BRANCH_FILE" ]]; then
    last_branch="$(cat "$LAST_BRANCH_FILE" || true)"
  else
    last_branch=""
  fi

  if [[ -n "$current_branch" && -n "$last_branch" && "$current_branch" != "$last_branch" ]]; then
    date_stamp="$(date +%Y-%m-%d)"
    folder_name="${last_branch#loop/}"
    target="$ARCHIVE_DIR/$date_stamp-$folder_name"
    mkdir -p "$target"
    cp "$PRD_FILE" "$target/" || true
    cp "$PROGRESS_FILE" "$target/" || true

    cat > "$PROGRESS_FILE" <<EOF
# Loop Progress Log

## Codebase Patterns
- Carry forward only reusable patterns, not raw logs.

---
Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
    echo "[loop] archived previous run to $target"
  fi

  if [[ -n "$current_branch" ]]; then
    printf "%s" "$current_branch" > "$LAST_BRANCH_FILE"
  fi
}

run_iteration() {
  local iteration="$1"
  local prompt output exit_code codex_args

  prompt="$(cat "$PROMPT_FILE")"
  codex_args=(exec --dangerously-bypass-approvals-and-sandbox -C "$REPO_ROOT")
  if [[ -n "$MODEL" ]]; then
    codex_args+=(--model "$MODEL")
  fi

  echo ""
  echo "==============================================================="
  if [[ "$MAX_ITERATIONS" -eq 0 ]]; then
    echo "  Loop Iteration $iteration (infinite)"
  else
    echo "  Loop Iteration $iteration of $MAX_ITERATIONS"
  fi
  echo "==============================================================="

  set +e
  output="$(codex "${codex_args[@]}" "$prompt" 2>&1 | tee /dev/stderr)"
  exit_code=$?
  set -e

  if tail -n 60 <<< "$output" | grep -q "$COMPLETION_TOKEN"; then
    echo "[loop] completion token found. exiting."
    return 10
  fi

  if [[ $exit_code -ne 0 ]]; then
    echo "[loop] codex returned non-zero exit code: $exit_code"
    return 20
  fi

  return 0
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --max-iterations)
        MAX_ITERATIONS="${2:-}"
        shift 2
        ;;
      --sleep-seconds)
        SLEEP_SECONDS="${2:-}"
        shift 2
        ;;
      --model)
        MODEL="${2:-}"
        shift 2
        ;;
      --completion-token)
        COMPLETION_TOKEN="${2:-}"
        shift 2
        ;;
      --auto-promote)
        AUTO_PROMOTE=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "[loop] unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
    echo "[loop] --max-iterations must be a non-negative integer" >&2
    exit 1
  fi

  if ! [[ "$SLEEP_SECONDS" =~ ^[0-9]+$ ]]; then
    echo "[loop] --sleep-seconds must be a non-negative integer" >&2
    exit 1
  fi

  ensure_loop_files
  archive_if_branch_changed

  local i=1
  while true; do
    set +e
    run_iteration "$i"
    result=$?
    set -e

    if [[ $result -eq 10 ]]; then
      if [[ "$AUTO_PROMOTE" -eq 1 ]]; then
        current_branch="$(get_prd_branch_name)"
        if [[ "$current_branch" =~ ^agent/growth/(.+)$ ]]; then
          task_slug="${BASH_REMATCH[1]}"
          echo "[loop] auto-promote enabled. task=$task_slug"
          bash "$REPO_ROOT/scripts/worktree/auto-promote.sh" growth "$task_slug" main || {
            echo "[loop] auto-promote failed. fix and re-run manually."
            exit 1
          }
        else
          echo "[loop] auto-promote requires prd branch format agent/growth/<task>. current: $current_branch" >&2
          exit 1
        fi
      fi
      exit 0
    fi

    if [[ $result -eq 20 ]]; then
      echo "[loop] continuing after failure in ${SLEEP_SECONDS}s"
    fi

    if [[ "$MAX_ITERATIONS" -gt 0 && "$i" -ge "$MAX_ITERATIONS" ]]; then
      echo "[loop] reached max iterations: $MAX_ITERATIONS"
      exit 1
    fi

    i=$((i + 1))
    sleep "$SLEEP_SECONDS"
  done
}

main "$@"
