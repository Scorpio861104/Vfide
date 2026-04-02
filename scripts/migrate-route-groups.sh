#!/bin/bash
# Preview or apply VFIDE route-group moves without changing public URLs.

set -euo pipefail

MODE="dry-run"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
elif [[ "${1:-}" == "--cleanup" ]]; then
  MODE="cleanup"
fi

move_route() {
  local route="$1"
  local group="$2"
  local src="app/$route"
  local dest="app/$group/$route"

  if [ ! -d "$src" ]; then
    echo "  ⊘ $src — not found"
    return
  fi

  if [ -d "$dest" ]; then
    echo "  ⊘ $dest — already exists"
    return
  fi

  if [ "$MODE" = "dry-run" ]; then
    echo "  → $src -> $dest"
    return
  fi

  mkdir -p "$(dirname "$dest")"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git mv "$src" "$dest" 2>/dev/null || mv "$src" "$dest"
  else
    mv "$src" "$dest"
  fi
  echo "  ✓ moved $src -> $dest"
}

if [ "$MODE" = "cleanup" ]; then
  echo "Cleanup mode is only needed after a real migration. Remove any now-empty directories manually if desired."
  exit 0
fi

echo "Route-group migration mode: $MODE"
echo ""

echo "(marketing)"
for route in about docs legal support benefits seer-academy; do
  move_route "$route" "(marketing)"
done

echo ""
echo "(auth)"
for route in dashboard profile notifications; do
  move_route "$route" "(auth)"
done

echo ""
echo "(finance)"
for route in vault treasury vesting payroll escrow streaming subscriptions budgets taxes time-locks; do
  move_route "$route" "(finance)"
done

echo ""
echo "(commerce)"
for route in merchant merchants marketplace store product pos buy checkout pay; do
  move_route "$route" "(commerce)"
done

echo ""
echo "(governance)"
for route in governance dao-hub council appeals; do
  move_route "$route" "(governance)"
done

echo ""
echo "(social)"
for route in social social-hub social-messaging social-payments feed stories endorsements; do
  move_route "$route" "(social)"
done

echo ""
echo "(security)"
for route in guardians security-center multisig stealth hardware-wallet paper-wallet; do
  move_route "$route" "(security)"
done

echo ""
echo "(gamification)"
for route in quests achievements badges leaderboard headhunter rewards; do
  move_route "$route" "(gamification)"
done

echo ""
echo "(seer)"
for route in seer-service flashlight insights agent; do
  move_route "$route" "(seer)"
done

echo ""
echo "Done. Use --apply to perform the moves after reviewing the dry run."
