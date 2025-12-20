#!/bin/bash
# Generate TypeScript ABIs from compiled Solidity contracts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

OUTPUT_DIR="$PROJECT_ROOT/frontend/lib/abis"
OUT_DIR="$PROJECT_ROOT/out"

mkdir -p "$OUTPUT_DIR"

# Map contract names to their source file locations
# Format: "ContractName:SourceFile"
CONTRACTS=(
  "VFIDEToken:VFIDEToken.sol"
  "VFIDEPresale:VFIDEPresale.sol"
  "VFIDECommerce:VFIDECommerce.sol"
  "StablecoinRegistry:StablecoinRegistry.sol"
  "VaultInfrastructure:VaultInfrastructure.sol"
  "Seer:VFIDETrust.sol"
  "VFIDEBadgeNFT:VFIDEBadgeNFT.sol"
  "DAO:DAO.sol"
  "DAOTimelock:DAOTimelock.sol"
  "SecurityHub:VFIDESecurity.sol"
  "GuardianRegistry:VFIDESecurity.sol"
  "GuardianLock:VFIDESecurity.sol"
  "PanicGuard:VFIDESecurity.sol"
  "EmergencyBreaker:VFIDESecurity.sol"
  "MerchantRegistry:VFIDECommerce.sol"
  "MerchantPortal:MerchantPortal.sol"
  "ProofScoreBurnRouter:ProofScoreBurnRouter.sol"
  "ProofLedger:VFIDETrust.sol"
  "CommerceEscrow:VFIDECommerce.sol"
)

echo "Generating TypeScript ABIs..."

for ENTRY in "${CONTRACTS[@]}"; do
  CONTRACT="${ENTRY%%:*}"
  SOURCE="${ENTRY##*:}"
  JSON_FILE="$OUT_DIR/$SOURCE/$CONTRACT.json"
  
  if [ -f "$JSON_FILE" ]; then
    # Extract just the ABI and format as TypeScript
    jq '.abi' "$JSON_FILE" > "$OUTPUT_DIR/$CONTRACT.json"
    echo "  ✓ $CONTRACT"
  else
    echo "  ✗ $CONTRACT (not found at $JSON_FILE)"
  fi
done

# Generate index file
cat > "$OUTPUT_DIR/index.ts" << 'EOF'
// Auto-generated contract ABIs
// Run: ./scripts/generate-abis.sh to regenerate

EOF

for ENTRY in "${CONTRACTS[@]}"; do
  CONTRACT="${ENTRY%%:*}"
  if [ -f "$OUTPUT_DIR/$CONTRACT.json" ]; then
    echo "import ${CONTRACT}ABI from './$CONTRACT.json'" >> "$OUTPUT_DIR/index.ts"
  fi
done

echo "" >> "$OUTPUT_DIR/index.ts"
echo "export {" >> "$OUTPUT_DIR/index.ts"

for ENTRY in "${CONTRACTS[@]}"; do
  CONTRACT="${ENTRY%%:*}"
  if [ -f "$OUTPUT_DIR/$CONTRACT.json" ]; then
    echo "  ${CONTRACT}ABI," >> "$OUTPUT_DIR/index.ts"
  fi
done

echo "}" >> "$OUTPUT_DIR/index.ts"

echo ""
echo "Done! ABIs generated in $OUTPUT_DIR"
