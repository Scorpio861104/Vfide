#!/bin/bash
# Strip TEST functions from contracts for zkSync production deployment
# This removes exhaustive test helper functions that bloat contract size

echo "🔧 Creating production contracts for zkSync deployment..."
echo ""

# Create production directory
mkdir -p contracts-prod contracts-prod/interfaces contracts-prod/mocks

# Function to strip TEST_ functions from a file
strip_test_functions() {
    local input_file="$1"
    local output_file="$2"
    
    if [ ! -f "$input_file" ]; then
        echo "⚠️  Skipping $input_file (not found)"
        return
    fi
    
    # Use perl to remove TEST_ functions (more reliable than sed for multiline)
    perl -0777 -pe 's/function TEST_[^}]*\}[^\n]*\n//gs' "$input_file" > "$output_file"
    
    # Get size reduction
    local original_size=$(wc -c < "$input_file")
    local new_size=$(wc -c < "$output_file")
    local reduction=$((original_size - new_size))
    local percent=$((reduction * 100 / original_size))
    
    echo "✓ $(basename $input_file): Removed ${reduction} bytes (${percent}%)"
}

echo "📦 Processing core contracts..."

# Process main contracts (strip TEST functions)
strip_test_functions "contracts-min/VFIDECommerce.sol" "contracts-prod/VFIDECommerce.sol"
strip_test_functions "contracts-min/VFIDEFinance.sol" "contracts-prod/VFIDEFinance.sol"
strip_test_functions "contracts-min/VFIDEToken.sol" "contracts-prod/VFIDEToken.sol"

# Copy other contracts as-is (no TEST functions)
echo ""
echo "📋 Copying other contracts..."

for contract in DevReserveVestingVault DAO DAOTimelock CouncilElection \
                EmergencyControl GovernanceHooks ProofLedger ProofScoreBurnRouter \
                Seer SystemHandover VaultInfrastructure VFIDEPresale \
                VFIDESecurity VFIDETrust; do
    if [ -f "contracts-min/${contract}.sol" ]; then
        cp "contracts-min/${contract}.sol" "contracts-prod/${contract}.sol"
        echo "✓ ${contract}.sol"
    fi
done

# Copy interfaces
echo ""
echo "📁 Copying interfaces..."
if [ -d "contracts-min/interfaces" ]; then
    cp -r contracts-min/interfaces/* contracts-prod/interfaces/ 2>/dev/null
    echo "✓ Interfaces copied"
fi

# Don't copy mocks (not needed for production)
echo ""
echo "⏭️  Skipping mocks (not needed for production)"

echo ""
echo "✅ Production contracts ready in contracts-prod/"
echo ""
echo "Next steps:"
echo "  1. npx hardhat compile (will use contracts-prod/)"
echo "  2. npx hardhat size-contracts (verify < 24KB)"
echo "  3. npx hardhat run scripts/deploy-zksync.js --network zkSyncSepoliaTestnet"
