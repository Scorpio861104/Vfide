#!/bin/bash

# ===========================================
#  VFIDE COMPREHENSIVE TESTNET TEST RUNNER
# ===========================================
#
# This script runs all testnet tests in sequence
# and generates a comprehensive report.
#
# Usage:
#   ./run_all_tests.sh [options]
#
# Options:
#   --dry-run     Show what would be run without executing
#   --verbose     Show detailed output
#   --report      Generate markdown report
#   --quick       Run only critical tests
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="zksync-sepolia"
RPC_URL="${ZKSYNC_SEPOLIA_RPC:-https://sepolia.era.zksync.dev}"
CHAIN_ID="300"

# Test scripts in order
TESTS=(
    "01_DeploymentVerifier.s.sol"
    "02_PresaleE2E.s.sol"
    "03_VaultE2E.s.sol"
    "04_CommerceE2E.s.sol"
    "05_GovernanceE2E.s.sol"
    "06_StressTest.s.sol"
    "07_InvariantChecks.s.sol"
    "08_EmergencyTests.s.sol"
    "09_VestingTests.s.sol"
    "10_EcosystemVaults.s.sol"
)

QUICK_TESTS=(
    "01_DeploymentVerifier.s.sol"
    "07_InvariantChecks.s.sol"
)

# Parse arguments
DRY_RUN=false
VERBOSE=false
REPORT=false
QUICK=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --verbose)
            VERBOSE=true
            ;;
        --report)
            REPORT=true
            ;;
        --quick)
            QUICK=true
            ;;
    esac
done

# Select test set
if [ "$QUICK" = true ]; then
    SELECTED_TESTS=("${QUICK_TESTS[@]}")
else
    SELECTED_TESTS=("${TESTS[@]}")
fi

# Header
echo ""
echo "==========================================="
echo "  VFIDE TESTNET TEST SUITE"
echo "==========================================="
echo ""
echo "  Network:    $NETWORK"
echo "  RPC URL:    $RPC_URL"
echo "  Chain ID:   $CHAIN_ID"
echo "  Test Count: ${#SELECTED_TESTS[@]}"
echo ""
echo "==========================================="
echo ""

# Start time
START_TIME=$(date +%s)

# Results tracking
PASSED=0
FAILED=0
SKIPPED=0
declare -A RESULTS

# Run each test
for test in "${SELECTED_TESTS[@]}"; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ Running: $test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY RUN] Would execute: forge script script/testnet/$test"
        RESULTS[$test]="SKIPPED"
        ((SKIPPED++))
        continue
    fi
    
    # Build the forge command
    CMD="forge script script/testnet/$test --rpc-url $RPC_URL --chain-id $CHAIN_ID"
    
    if [ "$VERBOSE" = true ]; then
        CMD="$CMD -vvvv"
    else
        CMD="$CMD -v"
    fi
    
    # Execute
    if $CMD; then
        echo -e "${GREEN}✓ PASSED: $test${NC}"
        RESULTS[$test]="PASSED"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED: $test${NC}"
        RESULTS[$test]="FAILED"
        ((FAILED++))
    fi
    
    echo ""
done

# End time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Summary
echo ""
echo "==========================================="
echo "  TEST SUMMARY"
echo "==========================================="
echo ""
echo "  Duration: ${DURATION}s"
echo ""
echo -e "  ${GREEN}Passed:  $PASSED${NC}"
echo -e "  ${RED}Failed:  $FAILED${NC}"
echo -e "  ${YELLOW}Skipped: $SKIPPED${NC}"
echo ""
echo "  Results:"
for test in "${SELECTED_TESTS[@]}"; do
    status=${RESULTS[$test]}
    case $status in
        PASSED)
            echo -e "    ${GREEN}✓${NC} $test"
            ;;
        FAILED)
            echo -e "    ${RED}✗${NC} $test"
            ;;
        SKIPPED)
            echo -e "    ${YELLOW}⊘${NC} $test"
            ;;
    esac
done
echo ""
echo "==========================================="

# Generate report if requested
if [ "$REPORT" = true ]; then
    REPORT_FILE="testnet_test_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# VFIDE Testnet Test Report

**Generated:** $(date)
**Network:** $NETWORK
**Chain ID:** $CHAIN_ID

## Summary

| Metric | Count |
|--------|-------|
| Passed | $PASSED |
| Failed | $FAILED |
| Skipped | $SKIPPED |
| Duration | ${DURATION}s |

## Test Results

| Test Script | Status |
|-------------|--------|
EOF
    
    for test in "${SELECTED_TESTS[@]}"; do
        status=${RESULTS[$test]}
        case $status in
            PASSED)
                echo "| $test | ✅ Passed |" >> "$REPORT_FILE"
                ;;
            FAILED)
                echo "| $test | ❌ Failed |" >> "$REPORT_FILE"
                ;;
            SKIPPED)
                echo "| $test | ⏭️ Skipped |" >> "$REPORT_FILE"
                ;;
        esac
    done
    
    cat >> "$REPORT_FILE" << EOF

## Test Coverage

### 01_DeploymentVerifier
- Contract deployment validation
- Address wiring verification
- Initial state checks

### 02_PresaleE2E
- Token purchases (ETH → VFIDE)
- Referral system
- Lock mechanisms
- Claim flows
- Finalization

### 03_VaultE2E
- Vault creation
- VFIDE transfers
- Guardian management
- Panic mode
- Recovery mechanisms

### 04_CommerceE2E
- Merchant registration
- Escrow lifecycle
- Disputes and resolution
- Seizure mechanics

### 05_GovernanceE2E
- DAO proposals
- Voting mechanics
- Timelock execution
- Council elections
- Parameter changes

### 06_StressTest
- High-volume transactions
- Concurrent operations
- Gas limits
- Array bounds

### 07_InvariantChecks
- Supply invariants
- Balance invariants
- State machine validity
- Edge cases

### 08_EmergencyTests
- Panic mode activation
- Circuit breakers
- Trust gateway

### 09_VestingTests
- Cliff enforcement
- Linear vesting
- Lock schedules

### 10_EcosystemVaults
- Reward distribution
- Vault balances
- Allocation invariants

---
*Report generated by VFIDE Test Suite*
EOF
    
    echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}"
fi

# Exit with failure if any tests failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0
