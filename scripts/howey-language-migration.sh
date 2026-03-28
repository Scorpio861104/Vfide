#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# VFIDE Howey-Safe Language Migration
# Replaces reward/yield/earn language with work-for-pay language
# across the entire codebase.
#
# Usage:
#   chmod +x scripts/howey-language-migration.sh
#   ./scripts/howey-language-migration.sh --dry-run
#   ./scripts/howey-language-migration.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "═══ DRY RUN MODE ═══"
fi

CHANGES=0

find_replace() {
  local pattern="$1"
  local replacement="$2"
  local description="$3"

  local files
  files=$(grep -rlnI "$pattern" \
    --include="*.sol" --include="*.ts" --include="*.tsx" --include="*.js" \
    --include="*.json" --include="*.md" --include="*.sql" \
    . 2>/dev/null | grep -v node_modules | grep -v ".git/" | grep -v "howey-language-migration" || true)

  if [ -n "$files" ]; then
    local count
    count=$(echo "$files" | wc -l)
    echo "  [$count files] $description"
    echo "    $pattern → $replacement"

    if [ "$DRY_RUN" = false ]; then
      echo "$files" | while read -r f; do
        sed -i "s/$pattern/$replacement/g" "$f"
      done
    fi

    ((CHANGES += count))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Howey-Safe Language Migration"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────
# 1. EVENT NAMES (most critical — on-chain permanent)
# ─────────────────────────────────────────────
echo "▶ 1. Solidity event names"
find_replace "RewardClaimed" "WorkPaymentClaimed" "Event: RewardClaimed"
find_replace "RewardDistributed" "ServicePaymentDistributed" "Event: RewardDistributed"
find_replace "RewardPaid" "WorkPaymentPaid" "Event: RewardPaid"
find_replace "StakingReward" "ServicePayment" "Event: StakingReward"
find_replace "IncentiveDistributed" "ServicePaymentDistributed" "Event: IncentiveDistributed"

echo ""

# ─────────────────────────────────────────────
# 2. FUNCTION NAMES
# ─────────────────────────────────────────────
echo "▶ 2. Solidity function names"
find_replace "claimReward" "claimServicePayment" "Function: claimReward"
find_replace "distributeRewards" "distributeServicePayments" "Function: distributeRewards"
find_replace "getReward" "getServicePayment" "Function: getReward"
find_replace "pendingReward" "pendingPayment" "Function: pendingReward"
find_replace "calculateReward" "calculatePayment" "Function: calculateReward"
find_replace "rewardRate" "paymentRate" "Function: rewardRate"
find_replace "rewardPerToken" "paymentPerTask" "Function: rewardPerToken"

echo ""

# ─────────────────────────────────────────────
# 3. VARIABLE / STATE NAMES
# ─────────────────────────────────────────────
echo "▶ 3. Solidity state variables"
find_replace "rewardBalance" "paymentBudget" "State: rewardBalance"
find_replace "rewardVault" "paymentManager" "State: rewardVault"
find_replace "RewardVault" "WorkPaymentManager" "Contract: RewardVault"
find_replace "totalRewards" "totalPayments" "State: totalRewards"
find_replace "userRewards" "workerPayments" "State: userRewards"
find_replace "rewardToken" "paymentToken" "State: rewardToken"

echo ""

# ─────────────────────────────────────────────
# 4. NATSPEC / COMMENTS
# ─────────────────────────────────────────────
echo "▶ 4. NatSpec and code comments"
find_replace "reward" "service payment" "Comment: reward (lowercase)"
find_replace "Reward" "Service payment" "Comment: Reward (uppercase)"
find_replace "earn tokens" "receive payment for work" "Comment: earn tokens"
find_replace "Earn tokens" "Receive payment for work" "Comment: Earn tokens"
find_replace "earning" "getting paid" "Comment: earning"
find_replace "passive income" "service compensation" "Comment: passive income"
find_replace "yield" "payment" "Comment: yield"
find_replace "Yield" "Payment" "Comment: Yield"
find_replace "staking reward" "service payment" "Comment: staking reward"
find_replace "APY" "rate" "Comment: APY"
find_replace "APR" "rate" "Comment: APR"
find_replace "annual percentage" "payment rate" "Comment: annual percentage"

echo ""

# ─────────────────────────────────────────────
# 5. FRONTEND COPY
# ─────────────────────────────────────────────
echo "▶ 5. Frontend UI text"
find_replace "Earn VFIDE" "Get paid in VFIDE" "UI: Earn VFIDE"
find_replace "earn VFIDE" "get paid in VFIDE" "UI: earn VFIDE"
find_replace "Your Rewards" "Your Payments" "UI: Your Rewards"
find_replace "Claim Rewards" "Claim Payment" "UI: Claim Rewards"
find_replace "Pending Rewards" "Pending Payments" "UI: Pending Rewards"
find_replace "Total Earned" "Total Received" "UI: Total Earned"
find_replace "Staking Rewards" "Service Payments" "UI: Staking Rewards"
find_replace "rewards page" "payments page" "UI: rewards page"

echo ""

# ─────────────────────────────────────────────
# 6. API / DATABASE
# ─────────────────────────────────────────────
echo "▶ 6. API routes and database"
find_replace "\/rewards" "\/payments" "API route: /rewards"
find_replace "rewards_table" "service_payments" "DB table: rewards_table"
find_replace "user_rewards" "worker_payments" "DB table: user_rewards"

echo ""

# ─────────────────────────────────────────────
# 7. DELETE DANGEROUS FILES
# ─────────────────────────────────────────────
echo "▶ 7. Files to delete entirely"
for f in \
  "contracts/VFIDEStaking.sol" \
  "contracts/StakingRewards.sol" \
  "contracts/GovernancePower.sol" \
  "contracts/LiquidityIncentivesV2.sol" \
  "contracts/RewardVault.sol" \
  "app/staking" \
  "app/rewards" \
  "hooks/useStaking.ts" \
  "hooks/useRewards.ts" \
  "lib/abis/VFIDEStaking.json" \
  "lib/abis/StakingRewards.json" \
  "lib/abis/RewardVault.json"; do
  if [ -e "$f" ]; then
    echo "  DELETE: $f"
    if [ "$DRY_RUN" = false ]; then
      rm -rf "$f"
    fi
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Total files affected: $CHANGES"
echo "═══════════════════════════════════════════════════════════"

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "DRY RUN complete. Run without --dry-run to apply changes."
  echo ""
  echo "IMPORTANT: After running, manually review these files:"
  echo "  1. contracts/EcosystemVault.sol — verify WorkRewardPaid → WorkPaymentPaid"
  echo "  2. contracts/LiquidityIncentives.sol — already zero-reward, update comments"
  echo "  3. contracts/DutyDistributor.sol — already zero-reward, update comments"
  echo "  4. contracts/CouncilSalary.sol — already employment-framed, verify language"
  echo "  5. All marketing materials, README.md, whitepaper"
  echo "  6. Frontend component text and tooltips"
  echo ""
  echo "Terms that should NEVER appear in the final codebase:"
  echo "  - reward (in the context of token distribution)"
  echo "  - yield / APY / APR"
  echo "  - earn (in the context of passive returns)"
  echo "  - staking rewards"
  echo "  - passive income"
  echo "  - lock bonus / hold bonus"
  echo "  - investment returns"
fi
