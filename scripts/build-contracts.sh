#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════"
echo "  VFIDE Contract Build"
echo "═══════════════════════════════════════════════════"
echo

echo "1. Cleaning previous artifacts..."
npx hardhat clean
rm -rf artifacts/ cache/ typechain-types/
echo "   Done."

echo
echo "2. Compiling Solidity contracts..."
npm run -s contract:compile
echo "   Done."

echo
echo "3. Extracting ABIs for frontend..."
mkdir -p lib/abis

contracts=(
  VFIDEToken BurnRouter CardBoundVault VaultHub MerchantPortal CommerceEscrow
  Seer SeerView SeerSocial SeerAutonomous DAO DAOTimelock CouncilElection
  CouncilManager BadgeRegistry BadgeManager GuardianRegistry EmergencyControl
  CircuitBreaker SanctumVault SubscriptionManager PayrollManager StablecoinRegistry
  VFIDEFlashLoan VFIDETermLoan AdminMultiSig SystemHandover VaultInfrastructure VaultRecovery
)

for contract in "${contracts[@]}"; do
  artifact=$(find artifacts/contracts -name "${contract}.json" -not -path '*/build-info/*' | head -1 || true)
  if [[ -n "$artifact" ]]; then
    node -e "const a=require('./${artifact}');console.log(JSON.stringify(a.abi,null,2));" > "lib/abis/${contract}.json"
    echo "   ✅ ${contract}"
  else
    echo "   ⚠️  ${contract} — artifact not found"
  fi
done

echo
echo "4. Running on-chain verification..."
npm run -s test:onchain

echo
echo "5. Build complete"
echo "═══════════════════════════════════════════════════"
