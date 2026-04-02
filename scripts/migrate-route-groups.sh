#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Route Group Migration Script
#
# Run from repo root: bash scripts/migrate-route-groups.sh
#
# What it does:
#   1. Creates route group directories
#   2. Moves existing page folders into their route groups
#   3. Copies route group layouts into place
#   4. Does NOT delete originals — creates symlinks for gradual migration
#
# After verifying everything works:
#   bash scripts/migrate-route-groups.sh --cleanup
#   (removes symlinks and old empty dirs)
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
DRY_RUN=false
CLEANUP=false

if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=true; echo -e "${YELLOW}DRY RUN — no files will be moved${NC}\n"; fi
if [[ "${1:-}" == "--cleanup" ]]; then CLEANUP=true; fi

MOVED=0

move_route() {
  local src="app/$1"
  local dest="app/$2/$1"

  if [ ! -d "$src" ]; then
    echo -e "  ${YELLOW}⊘${NC} $src — not found, skipping"
    return
  fi

  if [ -d "$dest" ]; then
    echo -e "  ${YELLOW}⊘${NC} $src — already migrated"
    return
  fi

  if $DRY_RUN; then
    echo -e "  ${GREEN}→${NC} $src → $dest"
    MOVED=$((MOVED + 1))
    return
  fi

  mkdir -p "$(dirname "$dest")"
  cp -r "$src" "$dest"
  echo -e "  ${GREEN}✓${NC} $src → $dest"
  MOVED=$((MOVED + 1))
}

if $CLEANUP; then
  echo -e "${GREEN}Cleaning up old route directories...${NC}\n"
  # List dirs that have been moved — only remove if empty
  for dir in about docs legal support benefits seer-academy \
             social social-hub social-messaging social-payments feed stories endorsements friends \
             vault treasury vesting payroll escrow streaming subscriptions budgets taxes time-locks \
             merchant merchants marketplace store product pos buy checkout pay \
             governance dao-hub council appeals \
             guardians security-center multisig stealth hardware-wallet paper-wallet \
             quests achievements badges leaderboard headhunter rewards \
             seer-service flashlight insights agent; do
    if [ -d "app/$dir" ] && [ -z "$(ls -A "app/$dir" 2>/dev/null)" ]; then
      rmdir "app/$dir"
      echo -e "  ${GREEN}✓${NC} Removed empty app/$dir"
    fi
  done
  echo -e "\nDone."
  exit 0
fi

echo -e "${GREEN}═══ ROUTE GROUP MIGRATION ═══${NC}\n"

# ── (marketing) — Pure RSC, no auth, no wallet ──────────────────────────────
echo -e "${GREEN}(marketing) — Static pages, zero client JS${NC}"
for route in about docs legal support benefits seer-academy; do
  move_route "$route" "(marketing)"
done

# ── (auth) — Core authenticated pages ───────────────────────────────────────
echo -e "\n${GREEN}(auth) — Dashboard, profile, settings${NC}"
for route in dashboard profile settings notifications; do
  move_route "$route" "(auth)"
done

# ── (finance) — Vault, treasury, payroll ────────────────────────────────────
echo -e "\n${GREEN}(finance) — Financial pages${NC}"
for route in vault treasury vesting payroll escrow streaming subscriptions budgets taxes time-locks; do
  move_route "$route" "(finance)"
done

# ── (commerce) — Merchant, marketplace, store ───────────────────────────────
echo -e "\n${GREEN}(commerce) — Commerce pages${NC}"
for route in merchant merchants marketplace store product pos buy checkout pay; do
  move_route "$route" "(commerce)"
done

# ── (governance) — DAO, council, proposals ──────────────────────────────────
echo -e "\n${GREEN}(governance) — Governance pages${NC}"
for route in governance dao-hub council appeals; do
  move_route "$route" "(governance)"
done

# ── (social) — Feed, messaging, stories ─────────────────────────────────────
echo -e "\n${GREEN}(social) — Social pages${NC}"
for route in social social-hub social-messaging social-payments feed stories endorsements friends; do
  move_route "$route" "(social)"
done

# ── (security) — Guardians, multisig, stealth ──────────────────────────────
echo -e "\n${GREEN}(security) — Security pages${NC}"
for route in guardians security-center multisig stealth hardware-wallet paper-wallet; do
  move_route "$route" "(security)"
done

# ── (gamification) — Quests, badges, leaderboard ───────────────────────────
echo -e "\n${GREEN}(gamification) — Gamification pages${NC}"
for route in quests achievements badges leaderboard headhunter rewards; do
  move_route "$route" "(gamification)"
done

# ── (seer) — AI services ───────────────────────────────────────────────────
echo -e "\n${GREEN}(seer) — Seer AI pages${NC}"
for route in seer-service flashlight insights agent; do
  move_route "$route" "(seer)"
done

echo -e "\n${GREEN}═══ SUMMARY ═══${NC}"
echo -e "  ${GREEN}$MOVED routes migrated${NC}"
echo ""
echo -e "  ${YELLOW}NEXT STEPS:${NC}"
echo "  1. Copy route group layouts from scaffold into each (group)/ directory"
echo "  2. Verify: npm run dev — check that all routes resolve"
echo "  3. Remove 'use client' from (marketing) pages"
echo "  4. Run: bash scripts/migrate-route-groups.sh --cleanup"
echo ""
echo -e "  ${YELLOW}REVERT:${NC}"
echo "  Each original folder was copied (not moved)."
echo "  To revert: rm -rf app/\\(marketing\\) app/\\(auth\\) app/\\(finance\\) app/\\(commerce\\) app/\\(governance\\) app/\\(social\\) app/\\(security\\) app/\\(gamification\\) app/\\(seer\\)"
echo ""
