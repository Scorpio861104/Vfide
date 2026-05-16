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
  # Core token + vault
  VFIDEToken ProofScoreBurnRouter CardBoundVault CardBoundVaultDeployer VaultHub
  ProofLedger StablecoinRegistry

  # Commerce + merchant
  MerchantPortal VFIDECommerce CommerceEscrow MerchantRegistry FraudRegistry

  # Seer + governance
  Seer DAO DAOTimelock GovernanceHooks AdminMultiSig SystemHandover
  OwnerControlPanel EmergencyControl

  # Lending + finance
  VFIDEFlashLoan VFIDETermLoan PayrollManager EcoTreasuryVault VFIDEPriceOracle

  # Treasury + distribution
  FeeDistributor SanctumVault EcosystemVault EcosystemVaultView
  DAOPayrollPool MerchantCompetitionPool HeadhunterCompetitionPool
  ServicePool RevenueSplitter LiquidityIncentives DutyDistributor
  DevReserveVestingVault

  # Vault auxiliaries
  VaultRegistry VaultRecoveryClaim

  # Testnet faucet
  VFIDETestnetFaucet
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
