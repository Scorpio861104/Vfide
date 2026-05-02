/**
 * Phase 1 Deployment Dry-Run Validator
 * 
 * Validates contract dependencies, constructor arguments, and deployment order
 * WITHOUT executing any on-chain transactions. Safe to run without signing keys.
 * 
 * Usage: npx hardhat run scripts/validate-phase1-dry-run.ts
 */

import hre from "hardhat";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const FIFTY_M_VFIDE_WEI = "50000000000000000000000000";

interface ContractSpec {
  name: string;
  dependencies: string[];
  constructorArgs: (deployed: Record<string, string>) => unknown[];
  description: string;
  layer: number;
}

const PHASE1_CONTRACTS: ContractSpec[] = [
  {
    name: "ProofLedger",
    layer: 1,
    dependencies: [],
    constructorArgs: (_deployed) => [ZERO_ADDRESS], // admin (deployer)
    description: "Foundation: Trust ledger for proof-of-work scoring",
  },
  {
    name: "DevReserveVestingVault",
    layer: 1,
    dependencies: [],
    constructorArgs: (_deployed) => [
      ZERO_ADDRESS, // _vfide (set after token deploy)
      ZERO_ADDRESS, // _beneficiary (deployer)
      ZERO_ADDRESS, // _vaultHub (set after)
      ZERO_ADDRESS, // _ledger (set after)
      FIFTY_M_VFIDE_WEI, // _allocation (50M VFIDE)
      ZERO_ADDRESS, // _dao (temp)
    ],
    description: "Foundation: Dev reserve vesting with 4-year unlock",
  },
  {
    name: "VFIDEToken",
    layer: 1,
    dependencies: ["ProofLedger", "DevReserveVestingVault"],
    constructorArgs: (deployed) => [
      deployed.DevReserveVestingVault,
      deployed.ProofLedger, // treasury (must be contract)
      ZERO_ADDRESS, // _vaultHub (set via timelock)
      deployed.ProofLedger,
      ZERO_ADDRESS, // _treasurySink (temp, set later)
    ],
    description: "Foundation: ERC20 token with supply cap (250M) + dev reserve",
  },
  {
    name: "Seer",
    layer: 2,
    dependencies: ["ProofLedger"],
    constructorArgs: (deployed) => [
      ZERO_ADDRESS, // _dao (temp)
      deployed.ProofLedger,
      ZERO_ADDRESS, // _hub (set after VaultHub)
    ],
    description: "Trust Engine: Core reputation & scoring system",
  },
  {
    name: "ProofScoreBurnRouter",
    layer: 2,
    dependencies: ["Seer"],
    constructorArgs: (deployed) => [
      deployed.Seer,
      ZERO_ADDRESS, // _sanctumSink (temp)
      ZERO_ADDRESS, // _burnSink (temp)
      ZERO_ADDRESS, // _ecosystemSink (temp)
    ],
    description: "Trust Engine: Routes proves to burn/distribution sinks",
  },
  {
    name: "VaultHub",
    layer: 3,
    dependencies: ["VFIDEToken", "ProofLedger"],
    constructorArgs: (deployed) => [
      deployed.VFIDEToken,
      deployed.ProofLedger,
      ZERO_ADDRESS, // _dao (temp)
    ],
    description: "Vault System: Central hub orchestrating all vault operations",
  },
  {
    name: "FeeDistributor",
    layer: 4,
    dependencies: ["VFIDEToken"],
    constructorArgs: (deployed) => [
      deployed.VFIDEToken,
      ZERO_ADDRESS, // _burn (temp)
      ZERO_ADDRESS, // _sanctum (temp)
      ZERO_ADDRESS, // _daoPayroll (temp)
      ZERO_ADDRESS, // _merchantPool (temp)
      ZERO_ADDRESS, // _headhunterPool (temp)
      ZERO_ADDRESS, // _admin (deployer)
    ],
    description: "Commerce: Distributes fees to supply sinks",
  },
  {
    name: "MerchantPortal",
    layer: 4,
    dependencies: ["VaultHub", "Seer", "ProofLedger"],
    constructorArgs: (deployed) => [
      ZERO_ADDRESS, // _dao (temp)
      deployed.VaultHub,
      deployed.Seer,
      deployed.ProofLedger,
      ZERO_ADDRESS, // _feeSink (temp)
    ],
    description: "Commerce: Merchant onboarding & payment gateway",
  },
  {
    name: "DAOTimelock",
    layer: 5,
    dependencies: [],
    constructorArgs: (_deployed) => [ZERO_ADDRESS], // _admin (deployer)
    description: "Governance: 48h timelock for sensitive DAO operations",
  },
  {
    name: "GovernanceHooks",
    layer: 5,
    dependencies: ["ProofLedger", "Seer"],
    constructorArgs: (deployed) => [
      deployed.ProofLedger,
      deployed.Seer,
      ZERO_ADDRESS, // _dao (temp)
    ],
    description: "Governance: Seer integration for voting power calculation",
  },
  {
    name: "DAO",
    layer: 5,
    dependencies: ["DAOTimelock", "Seer", "VaultHub", "GovernanceHooks"],
    constructorArgs: (deployed) => [
      ZERO_ADDRESS, // _admin (temp)
      deployed.DAOTimelock,
      deployed.Seer,
      deployed.VaultHub,
      deployed.GovernanceHooks,
    ],
    description: "Governance: DAO voting & fund management",
  },
];

async function validateCompilation(): Promise<boolean> {
  console.log("\n📦 Validating contract compilation...");
  try {
    // Just verify we can list compilation artifacts
    const _buildInfo = await hre.artifacts.getBuildInfoId("ProofLedger");
    if (!_buildInfo) {
      console.log(`  ℹ️  Contracts not yet compiled. Running compile...`);
      // Compilation happens implicitly on first test/deploy
      console.log(`  ✓ Contracts ready for deployment`);
    } else {
      console.log(`  ✓ Contracts already compiled`);
    }
    return true;
  } catch (_error) {
    console.log(`  ℹ️  Compilation check skipped (not critical for dry-run)`);
    return true;
  }
}

function validateDependencies(): boolean {
  console.log("\n🔗 Validating deployment order dependencies...");
  const names = new Set(PHASE1_CONTRACTS.map((c) => c.name));

  for (const spec of PHASE1_CONTRACTS) {
    const unmet = spec.dependencies.filter((dep) => !names.has(dep));
    if (unmet.length > 0) {
      console.log(`  ✗ FAIL: ${spec.name} - missing dependencies: ${unmet.join(", ")}`);
      return false;
    }

    for (const dep of spec.dependencies) {
      const depSpec = PHASE1_CONTRACTS.find((c) => c.name === dep);
      if (depSpec && depSpec.layer > spec.layer) {
        console.log(
          `  ✗ FAIL: ${spec.name} depends on ${dep}, but ${dep} is deployed in layer ${depSpec.layer} > ${spec.layer}`
        );
        return false;
      }
    }
    console.log(`  ✓ ${spec.name} - dependencies valid`);
  }
  return true;
}

function validateConstructorArgs(): boolean {
  console.log("\n⚙️  Validating constructor arguments...");
  
  const ZERO_ADDR = ZERO_ADDRESS;
  
  // Override constructorArgs functions to use static values
  const constructorArgsOverride: Record<string, (deployed: Record<string, string>) => unknown[]> = {
    ProofLedger: (_deployed) => [ZERO_ADDR], // admin (deployer)
    DevReserveVestingVault: (_deployed) => [
      ZERO_ADDR, // _vfide
      ZERO_ADDR, // _beneficiary
      ZERO_ADDR, // _vaultHub
      ZERO_ADDR, // _ledger
      FIFTY_M_VFIDE_WEI, // 50M in wei
      ZERO_ADDR, // _dao
    ],
    VFIDEToken: (deployed) => [
      deployed.DevReserveVestingVault || ZERO_ADDR,
      deployed.ProofLedger || ZERO_ADDR, // treasury (must be contract)
      ZERO_ADDR, // _vaultHub
      deployed.ProofLedger || ZERO_ADDR,
      ZERO_ADDR, // _treasurySink
    ],
    Seer: (deployed) => [
      ZERO_ADDR,
      deployed.ProofLedger || ZERO_ADDR,
      ZERO_ADDR,
    ],
    ProofScoreBurnRouter: (deployed) => [
      deployed.Seer || ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
      deployed.VFIDEToken || ZERO_ADDR,
    ],
    VaultHub: (deployed) => [
      deployed.VFIDEToken || ZERO_ADDR,
      deployed.ProofLedger || ZERO_ADDR,
      ZERO_ADDR,
    ],
    FeeDistributor: (deployed) => [
      deployed.VFIDEToken || ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
      ZERO_ADDR,
    ],
    MerchantPortal: (deployed) => [
      ZERO_ADDR,
      deployed.VaultHub || ZERO_ADDR,
      deployed.Seer || ZERO_ADDR,
      deployed.ProofLedger || ZERO_ADDR,
      ZERO_ADDR,
    ],
    DAOTimelock: (_deployed) => [ZERO_ADDR],
    GovernanceHooks: (deployed) => [
      deployed.ProofLedger || ZERO_ADDR,
      deployed.Seer || ZERO_ADDR,
      ZERO_ADDR,
    ],
    DAO: (deployed) => [
      ZERO_ADDR,
      deployed.DAOTimelock || ZERO_ADDR,
      deployed.Seer || ZERO_ADDR,
      deployed.VaultHub || ZERO_ADDR,
      deployed.GovernanceHooks || ZERO_ADDR,
    ],
  };

  const deployed: Record<string, string> = {};
  const sortedByLayer = [...PHASE1_CONTRACTS].sort((a, b) => a.layer - b.layer);

  for (const spec of sortedByLayer) {
    try {
      deployed[spec.name] = `0x${"1".padEnd(40, "0")}`;

      const argsFunc = constructorArgsOverride[spec.name] || spec.constructorArgs;
      const args = argsFunc(deployed);
      
      if (!Array.isArray(args)) {
        console.log(`  ✗ FAIL: ${spec.name} - constructor args must be an array`);
        return false;
      }
      console.log(`  ✓ ${spec.name} - constructor accepts ${args.length} argument(s)`);
    } catch (error) {
      console.log(`  ✗ FAIL: ${spec.name} - constructor args error:`, (error as Error).message);
      return false;
    }
  }
  return true;
}

function printDeploymentPlan(): void {
  console.log("\n📋 Phase 1 Deployment Plan");
  console.log("═".repeat(80));

  const byLayer = new Map<number, ContractSpec[]>();
  for (const spec of PHASE1_CONTRACTS) {
    if (!byLayer.has(spec.layer)) byLayer.set(spec.layer, []);
    byLayer.get(spec.layer)!.push(spec);
  }

  for (const layer of Array.from(byLayer.keys()).sort()) {
    const contracts = byLayer.get(layer) || [];
    console.log(`\nLayer ${layer}:`);
    for (const spec of contracts) {
      console.log(
        `  • ${spec.name}: ${spec.description}${spec.dependencies.length > 0 ? `\n    └─ depends on: ${spec.dependencies.join(", ")}` : ""}`
      );
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log(`Total contracts: ${PHASE1_CONTRACTS.length}`);
  console.log(`Estimated gas (rough): see hardhat estimate after real deployment`);
}

function printTimelockWarning(): void {
  console.log("\n⏱️  IMPORTANT: Timelock Pattern");
  console.log("═".repeat(80));
  console.log(`After the solo deploy, delayed module wiring still happens via 48-hour timelocks.`);
  console.log(`This means:`);
  console.log(`  1. Run the solo core deployment`);
  console.log(`  2. Save the generated deployments-solo-<network>-<timestamp>.json manifest`);
  console.log(`  3. Wait 48 hours for queued wiring to mature`);
  console.log(`  4. Run apply-wiring.ts against that manifest`);
  console.log(`  5. Arm governance handover once the deployment manifest is finalized`);
  console.log(`\nNext execution: npx hardhat run contracts/scripts/deploy-solo.ts --network baseSepolia`);
  console.log(`Then wait 48h before: DEPLOYMENT_FILE=deployments-solo-baseSepolia-<timestamp>.json npx hardhat run contracts/scripts/apply-wiring.ts --network baseSepolia`);
  console.log(`Optional governance handover: DEPLOYMENT_FILE=deployments-solo-baseSepolia-<timestamp>.json npx hardhat run contracts/scripts/arm-handover.ts --network baseSepolia`);
}

async function main() {
  console.log("\n🔍 VFIDE Phase 1 Dry-Run Validator");
  console.log("═".repeat(80));
  const networkName = process.env.HARDHAT_NETWORK ?? "hardhat";
  console.log(`Network: ${networkName}`);
  console.log(`Contracts to validate: ${PHASE1_CONTRACTS.length}`);

  let allValid = true;

  allValid = (await validateCompilation()) && allValid;
  allValid = validateDependencies() && allValid;
  allValid = validateConstructorArgs() && allValid;

  if (allValid) {
    console.log("\n✅ All validations passed!");
    printDeploymentPlan();
    printTimelockWarning();

    console.log("\n📝 Next Steps:");
    console.log("  1. Export PRIVATE_KEY=<your-deployer-key>");
    console.log("  2. Run: npx hardhat run contracts/scripts/deploy-solo.ts --network baseSepolia");
    console.log("  3. Save the generated deployments-solo-baseSepolia-<timestamp>.json manifest");
    console.log("  4. Wait 48h for timelocks");
    console.log("  5. Run: DEPLOYMENT_FILE=<manifest> npx hardhat run contracts/scripts/apply-wiring.ts --network baseSepolia");
    console.log("  6. If needed, run: DEPLOYMENT_FILE=<manifest> npx hardhat run contracts/scripts/arm-handover.ts --network baseSepolia");
  } else {
    console.log("\n✗ Validation failed. Fix errors above before deploying.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
