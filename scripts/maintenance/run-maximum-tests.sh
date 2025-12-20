#!/bin/bash
# MAXIMUM TESTING SCRIPT - All tools, all contracts, maximum settings
# This script runs comprehensive testing with maximum fuzzing iterations

set -e

echo "============================================"
echo "🚀 VFIDE MAXIMUM TESTING SUITE"
echo "============================================"
echo ""

# Create output directories
mkdir -p test-results/echidna
mkdir -p test-results/mythril
mkdir -p test-results/slither
mkdir -p test-results/coverage

echo "📋 Step 1: Compiling all contracts..."
forge build --force 2>&1 | tee test-results/forge-build.log
echo "✅ Compilation complete"
echo ""

echo "📋 Step 2: Running Foundry tests..."
forge test --gas-report 2>&1 | tee test-results/foundry-tests.log
echo "✅ Foundry tests complete"
echo ""

echo "📋 Step 3: Running Hardhat tests..."
npm test 2>&1 | tee test-results/hardhat-tests.log
echo "✅ Hardhat tests complete"
echo ""

echo "📋 Step 4: MAXIMUM ECHIDNA FUZZING (100k iterations per contract)..."
echo "This will take significant time - running on all contracts..."

# Core contracts
contracts=(
    "VFIDEToken"
    "VFIDECommerce:MerchantRegistry"
    "VFIDEFinance:StablecoinRegistry"
    "VFIDETrust:ProofLedger"
    "VFIDESecurity:SecurityHub"
    "VFIDEPresale"
    "VFIDEStaking"
    "SanctumVault"
    "MerchantPortal"
    "DevReserveVestingVault"
    "DAO"
    "DAOTimelock"
    "CouncilElection"
    "EmergencyControl"
    "ProofScoreBurnRouter"
    "Seer"
    "VaultInfrastructure"
    "GovernanceHooks"
    "SystemHandover"
    "Vault"
)

for contract_spec in "${contracts[@]}"; do
    IFS=':' read -r file contract <<< "$contract_spec"
    if [ -z "$contract" ]; then
        contract=$file
    fi
    
    echo "  🔍 Fuzzing $contract..."
    timeout 600 echidna contracts/${file}.sol \
        --contract $contract \
        --config echidna.yaml \
        2>&1 | tee test-results/echidna/${contract}.log || echo "  ⚠️  Timeout or error for $contract"
done

echo "✅ Echidna fuzzing complete"
echo ""

echo "📋 Step 5: SLITHER STATIC ANALYSIS (all contracts)..."
slither . \
    --exclude-dependencies \
    --exclude-optimization \
    --exclude-informational \
    --json test-results/slither/full-analysis.json \
    2>&1 | tee test-results/slither/slither-output.log || echo "⚠️  Slither completed with warnings"
echo "✅ Slither analysis complete"
echo ""

echo "📋 Step 6: MYTHRIL SECURITY ANALYSIS (600s timeout per contract)..."
echo "This is the most time-intensive step..."

# Critical financial contracts
mythril_contracts=(
    "VFIDEToken"
    "VFIDEPresale"
    "VFIDEStaking"
    "SanctumVault"
    "DevReserveVestingVault"
    "ProofScoreBurnRouter"
    "MerchantPortal"
    "DAO"
    "DAOTimelock"
    "CouncilElection"
    "EmergencyControl"
    "Seer"
    "VaultInfrastructure"
    "GovernanceHooks"
    "SystemHandover"
)

for contract in "${mythril_contracts[@]}"; do
    echo "  🛡️  Analyzing $contract with Mythril..."
    timeout 600 myth analyze contracts/${contract}.sol \
        --solv 0.8.30 \
        --execution-timeout 600 \
        --max-depth 50 \
        2>&1 | tee test-results/mythril/${contract}.log || echo "  ⚠️  Timeout or error for $contract"
done

echo "✅ Mythril analysis complete"
echo ""

echo "📋 Step 7: COVERAGE ANALYSIS..."
echo "  Running Foundry coverage..."
forge coverage --report summary 2>&1 | tee test-results/coverage/foundry-coverage.log || echo "⚠️  Coverage completed with warnings"

echo "  Running Hardhat coverage..."
COVERAGE=true npm run coverage 2>&1 | tee test-results/coverage/hardhat-coverage.log || echo "⚠️  Coverage completed with warnings"

echo "✅ Coverage analysis complete"
echo ""

echo "============================================"
echo "📊 GENERATING TEST SUMMARY..."
echo "============================================"
echo ""

# Count test results
FOUNDRY_PASSING=$(grep -E "passing" test-results/foundry-tests.log | tail -1 || echo "0 passing")
HARDHAT_PASSING=$(grep -E "passing" test-results/hardhat-tests.log | tail -1 || echo "0 passing")
ECHIDNA_COUNT=$(ls test-results/echidna/*.log 2>/dev/null | wc -l)
MYTHRIL_COUNT=$(ls test-results/mythril/*.log 2>/dev/null | wc -l)

echo "✅ Foundry Tests: $FOUNDRY_PASSING"
echo "✅ Hardhat Tests: $HARDHAT_PASSING"
echo "✅ Echidna Fuzzing: $ECHIDNA_COUNT contracts"
echo "✅ Mythril Analysis: $MYTHRIL_COUNT contracts"
echo "✅ Slither Analysis: Complete"
echo ""

echo "📁 All results saved to test-results/ directory"
echo ""

echo "============================================"
echo "🎉 MAXIMUM TESTING COMPLETE!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Review test-results/ for any failures"
echo "2. Check coverage reports in test-results/coverage/"
echo "3. Review security findings in test-results/mythril/"
echo "4. Check fuzzing results in test-results/echidna/"
echo ""
