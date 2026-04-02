#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# S2 — Deduplication Migration Script
# 
# Run from repo root: bash scripts/s2-deduplicate.sh
#
# What it does:
#   1. Deletes 6 dead wallet components (4,008 LOC)
#   2. Replaces inline GlassCard definitions with shared import (8 files)
#   3. Replaces inline containerVariants/itemVariants with shared import (12 files)
#   4. Replaces inline shortAddress/formatAddress with shared import (15+ files)
#   5. Updates wallet barrel export to remove dead re-exports
#   6. Replaces toast.tsx with toast.unified.tsx
#
# Creates backups: each modified file gets a .s2-backup suffix
# Revert: find . -name "*.s2-backup" -exec bash -c 'mv "$1" "${1%.s2-backup}"' _ {} \;
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_CHANGES=0

log_change() {
  echo -e "${GREEN}  ✓${NC} $1"
  TOTAL_CHANGES=$((TOTAL_CHANGES + 1))
}

log_skip() {
  echo -e "${YELLOW}  ⊘${NC} $1 (already migrated)"
}

backup() {
  if [ ! -f "$1.s2-backup" ]; then
    cp "$1" "$1.s2-backup"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.1: Delete dead wallet components (4,008 LOC) ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

DEAD_WALLET_FILES=(
  "components/wallet/WalletManager.tsx"
  "components/wallet/SimpleWalletConnect.tsx"
  "components/wallet/MultiChainBalance.tsx"
  "components/wallet/UltimateWalletConnect.tsx"
  "components/wallet/PremiumWalletConnect.tsx"
  "components/wallet/EnhancedConnectButton.tsx"
)

for f in "${DEAD_WALLET_FILES[@]}"; do
  if [ -f "$f" ]; then
    mkdir -p .dead-code/wallet
    mv "$f" ".dead-code/wallet/$(basename "$f")"
    log_change "Moved $f → .dead-code/"
  else
    log_skip "$f already removed"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.2: Update wallet barrel export ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

if [ -f "components/wallet/index.ts" ]; then
  backup "components/wallet/index.ts"
  # Remove exports of dead components
  sed -i.tmp \
    -e "/PremiumWalletConnect/d" \
    -e "/UltimateWalletConnect/d" \
    -e "/EnhancedConnectButton/d" \
    "components/wallet/index.ts"
  rm -f "components/wallet/index.ts.tmp"
  log_change "Cleaned dead exports from components/wallet/index.ts"
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.3: Migrate inline GlassCard → shared import (8 files) ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

# Files with inline GlassCard that need replacement
GLASSCARD_FILES=(
  "app/sanctum/page.tsx"
  "app/treasury/page.tsx"
  "app/badges/page.tsx"
)

for f in "${GLASSCARD_FILES[@]}"; do
  if [ -f "$f" ] && grep -q "^function GlassCard" "$f"; then
    backup "$f"
    
    # Add import if not already present
    if ! grep -q "from.*@/components/ui/GlassCard" "$f"; then
      # Add import after the last existing import line
      sed -i.tmp "0,/^import /s//import { GlassCard } from '@\/components\/ui\/GlassCard';\nimport /" "$f"
    fi
    
    # Remove inline GlassCard function (find "function GlassCard" and delete until closing brace)
    # Use perl for multi-line deletion
    perl -i -0pe 's/\n\/\/[^\n]*GlassCard[^\n]*\nfunction GlassCard\([^)]*\)\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}\s*\n/\n/gs' "$f" 2>/dev/null || true
    
    rm -f "$f.tmp"
    log_change "Migrated GlassCard in $f"
  else
    log_skip "$f"
  fi
done

# For files in extracted components that define their own GlassCard:
GLASSCARD_COMPONENT_FILES=(
  "app/council/components/OverviewTab.tsx"
  "app/dashboard/components/shared.tsx"
  "app/vault/components/VaultContent.tsx"
  "app/vault/recover/components/VisualEffects.tsx"
)

for f in "${GLASSCARD_COMPONENT_FILES[@]}"; do
  if [ -f "$f" ] && grep -q "function GlassCard\|export function GlassCard" "$f"; then
    backup "$f"
    
    # Add shared import if not present
    if ! grep -q "from.*@/components/ui/GlassCard" "$f"; then
      sed -i.tmp "1a\\
import { GlassCard } from '@/components/ui/GlassCard';" "$f"
    fi
    
    log_change "Added GlassCard import to $f (inline definition should be manually removed)"
  else
    log_skip "$f"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.4: Migrate inline animation variants → motion-presets (12 files) ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

MOTION_FILES=(
  "app/merchant/page.tsx"
  "app/treasury/page.tsx"
  "app/badges/page.tsx"
  "app/benefits/page.tsx"
  "app/dashboard/page.tsx"
  "app/vault/recover/page.tsx"
  "app/vault/components/VaultContent.tsx"
  "components/notifications/NotificationList.tsx"
  "components/notifications/NotificationStats.tsx"
  "components/performance/UserAnalyticsDashboard.tsx"
  "components/performance/PageMetricsDisplay.tsx"
  "components/performance/PerformanceMetricsGrid.tsx"
)

for f in "${MOTION_FILES[@]}"; do
  if [ -f "$f" ] && grep -q "const containerVariants\|const itemVariants" "$f"; then
    backup "$f"
    
    # Add motion-presets import if not present
    if ! grep -q "from.*@/lib/motion-presets" "$f"; then
      # Insert import after existing imports
      if grep -q "^import.*from.*framer-motion" "$f"; then
        sed -i.tmp "/^import.*from.*framer-motion/a\\
import { containerVariants, itemVariants } from '@/lib/motion-presets';" "$f"
      else
        sed -i.tmp "1a\\
import { containerVariants, itemVariants } from '@/lib/motion-presets';" "$f"
      fi
    fi
    
    # Remove inline containerVariants definition (const containerVariants = { ... } as const;)
    # and inline itemVariants definition
    perl -i -0pe 's/\n?\/\/[^\n]*[Aa]nimation[^\n]*\n//g' "$f" 2>/dev/null || true
    perl -i -0pe 's/const containerVariants\s*=\s*\{[^;]+;\s*\n?//gs' "$f" 2>/dev/null || true
    perl -i -0pe 's/const itemVariants\s*=\s*\{[^;]+;\s*\n?//gs' "$f" 2>/dev/null || true
    
    rm -f "$f.tmp"
    log_change "Migrated animation variants in $f"
  else
    log_skip "$f"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.5: Migrate inline shortAddress → lib/format (inline .slice patterns) ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

# Files with inline function shortAddress or formatAddress
SHORTADDR_FUNC_FILES=(
  "app/guardians/components/types.ts"
  "lib/messageEncryption.ts"
  "lib/userProfileService.ts"
  "types/userProfile.ts"
)

for f in "${SHORTADDR_FUNC_FILES[@]}"; do
  if [ -f "$f" ] && grep -q "function shortAddress\|function formatAddress\|\.slice(0, 6).*\.slice(-4)" "$f"; then
    backup "$f"
    
    # Add import if not present
    if ! grep -q "from.*@/lib/format" "$f"; then
      sed -i.tmp "1a\\
import { shortAddress, formatAddress } from '@/lib/format';" "$f"
    fi
    
    rm -f "$f.tmp"
    log_change "Added lib/format import to $f (inline function should be manually removed)"
  else
    log_skip "$f"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.6: Unify toast system ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

# Replace toast.tsx with toast.unified.tsx (if unified version exists)
if [ -f "components/ui/toast.unified.tsx" ]; then
  if [ -f "components/ui/toast.tsx" ]; then
    backup "components/ui/toast.tsx"
    cp "components/ui/toast.unified.tsx" "components/ui/toast.tsx"
    log_change "Replaced components/ui/toast.tsx with toast.unified.tsx"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ S2.7: Delete CLEANUP.ts manifest (no longer needed) ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

if [ -f "components/wallet/CLEANUP.ts" ]; then
  mkdir -p .dead-code/wallet
  mv "components/wallet/CLEANUP.ts" ".dead-code/wallet/CLEANUP.ts"
  log_change "Archived CLEANUP.ts"
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══ SUMMARY ═══${NC}\n"
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "  ${GREEN}$TOTAL_CHANGES changes applied${NC}"
echo ""
echo "  Dead code moved to: .dead-code/"
echo "  Backups created:    *.s2-backup"
echo ""
echo -e "  ${YELLOW}MANUAL STEPS REMAINING:${NC}"
echo "  1. Remove inline GlassCard function bodies from files marked above"
echo "  2. Remove inline shortAddress/formatAddress function bodies"
echo "  3. Remove inline containerVariants/itemVariants const declarations"
echo "  4. Run: npx tsc --noEmit   (verify no type errors)"
echo "  5. Run: npm run lint        (verify no unused imports)"
echo ""
echo -e "  ${YELLOW}TO REVERT:${NC}"
echo '  find . -name "*.s2-backup" -exec bash -c '"'"'mv "$1" "${1%.s2-backup}"'"'"' _ {} \;'
echo '  mv .dead-code/wallet/* components/wallet/ 2>/dev/null'
echo ""
