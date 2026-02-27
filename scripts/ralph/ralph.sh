#!/usr/bin/env bash
# =============================================================
# ralph.sh — Fazumi Ralph Loop Runner
# Usage: bash scripts/ralph/ralph.sh [story_id]
# Examples:
#   bash scripts/ralph/ralph.sh         # shows current story
#   bash scripts/ralph/ralph.sh S001    # mark S001 as IN_PROGRESS
#   bash scripts/ralph/ralph.sh done    # mark current IN_PROGRESS story as DONE
# =============================================================

set -euo pipefail

PROGRESS_FILE="scripts/ralph/progress.txt"
PRD_FILE="scripts/ralph/prd.json.example"

if [ ! -f "$PROGRESS_FILE" ]; then
  echo "ERROR: $PROGRESS_FILE not found. Run from repo root."
  exit 1
fi

# ---- helpers ----
current_story() {
  grep "= IN_PROGRESS" "$PROGRESS_FILE" | head -1 | awk '{print $1}'
}

next_pending() {
  grep "= PENDING" "$PROGRESS_FILE" | head -1 | awk '{print $1}'
}

show_status() {
  echo ""
  echo "=== Fazumi Ralph Loop Status ==="
  echo ""
  grep -v "^#" "$PROGRESS_FILE" | grep -v "^$"
  echo ""
  local cur
  cur=$(current_story)
  local nxt
  nxt=$(next_pending)
  if [ -n "$cur" ]; then
    echo ">> IN PROGRESS: $cur"
  elif [ -n "$nxt" ]; then
    echo ">> NEXT UP: $nxt"
    echo "   Start with: bash scripts/ralph/ralph.sh $nxt"
  else
    echo ">> ALL STORIES COMPLETE! Ship it."
  fi
  echo ""
}

mark_in_progress() {
  local story_id="$1"
  # Check for already in-progress
  local cur
  cur=$(current_story)
  if [ -n "$cur" ] && [ "$cur" != "$story_id" ]; then
    echo "WARNING: $cur is already IN_PROGRESS. Mark it DONE first."
    echo "  bash scripts/ralph/ralph.sh done"
    exit 1
  fi
  # Mark the story
  if grep -q "^$story_id = PENDING" "$PROGRESS_FILE"; then
    sed -i "s/^$story_id = PENDING/$story_id = IN_PROGRESS/" "$PROGRESS_FILE"
    echo "Marked $story_id as IN_PROGRESS."
    echo "Now paste the prompt from scripts/ralph/prompt.md into Claude Code."
  elif grep -q "^$story_id = DONE" "$PROGRESS_FILE"; then
    echo "$story_id is already DONE."
  elif grep -q "^$story_id = IN_PROGRESS" "$PROGRESS_FILE"; then
    echo "$story_id is already IN_PROGRESS."
  else
    echo "ERROR: Story $story_id not found in $PROGRESS_FILE"
    exit 1
  fi
}

mark_done() {
  local cur
  cur=$(current_story)
  if [ -z "$cur" ]; then
    echo "No story is IN_PROGRESS."
    show_status
    exit 0
  fi
  # Run checks before marking done
  echo "Running checks before marking $cur as DONE..."
  echo ""
  pnpm lint || { echo "FAIL: pnpm lint failed. Fix before marking done."; exit 1; }
  pnpm typecheck || { echo "FAIL: pnpm typecheck failed. Fix before marking done."; exit 1; }
  # pnpm test || { echo "FAIL: pnpm test failed. Fix before marking done."; exit 1; }
  echo ""
  echo "All checks passed."
  sed -i "s/^$cur = IN_PROGRESS/$cur = DONE/" "$PROGRESS_FILE"
  echo "Marked $cur as DONE."
  echo ""
  local nxt
  nxt=$(next_pending)
  if [ -n "$nxt" ]; then
    echo "Next story: $nxt"
    echo "Start with: bash scripts/ralph/ralph.sh $nxt"
  else
    echo "All stories complete!"
  fi
}

# ---- main ----
case "${1:-status}" in
  status)
    show_status
    ;;
  done)
    mark_done
    ;;
  *)
    mark_in_progress "$1"
    ;;
esac
