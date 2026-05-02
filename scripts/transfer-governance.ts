/**
 * VFIDE Governance Transfer Script
 * 
 * Transfers all admin/dao roles from deployer to correct governance addresses.
 * Run AFTER scripts/future/apply-phase3.ts (all module wiring complete).
 * 
 * CRITICAL: This is the most important post-deploy script. Without it:
 * - All fees go to deployer wallet (not FeeDistributor)
 * - DAO governance can't execute proposals (timelock admin = deployer)
 * - All Seer/FraudRegistry/GovernanceHooks management locked to deployer
 * 
 * Run: npx hardhat run scripts/transfer-governance.ts --network baseSepolia
 */

import hre from "hardhat";
const ethers = (hre as any).ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Transferring governance with:", deployer.address);

  // Load addresses from env
  const addrs = {
    token: process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS!,
    vaultHub: process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS!,
    seer: process.env.NEXT_PUBLIC_SEER_ADDRESS!,
    burnRouter: process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS!,
    dao: process.env.NEXT_PUBLIC_DAO_ADDRESS!,
    timelock: process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS!,
    feeDistributor: process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS!,
    fraudRegistry: process.env.NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS!,
    merchantPortal: process.env.NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS!,
    flashLoan: process.env.NEXT_PUBLIC_FLASH_LOAN_ADDRESS || "",
    hooks: process.env.NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS!,
    councilElection: process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS || "",
    systemHandover:
      process.env.NEXT_PUBLIC_SYSTEM_HANDOVER_ADDRESS ||
      process.env.SYSTEM_HANDOVER_ADDRESS ||
      "",
    // Set these after deploying the remaining contracts:
    ocp: process.env.NEXT_PUBLIC_OCP_ADDRESS || "",
    sanctumVault: process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS || "",
    ecosystemVault: process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS || "",
    daoPayrollPool: process.env.NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS || "",
    merchantPool: process.env.NEXT_PUBLIC_MERCHANT_POOL_ADDRESS || "",
    headhunterPool: process.env.NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS || "",
    termLoan: process.env.NEXT_PUBLIC_TERM_LOAN_ADDRESS || "",
    adminMultisig:
      process.env.NEXT_PUBLIC_ADMIN_MULTISIG_ADDRESS ||
      process.env.ADMIN_MULTISIG_ADDRESS ||
      "",
  };

  const allowCommingledFeeDestinations =
    process.env.ALLOW_COMMINGLED_FEE_DESTINATIONS === "true";
  const requireSystemHandover = process.env.REQUIRE_SYSTEM_HANDOVER !== "false";
  const finalizeOwnershipTransfer = process.env.FINALIZE_OWNERSHIP_TRANSFER === "true";

  for (const [name, addr] of Object.entries(addrs)) {
    if (!addr && ![
      "ocp",
      "sanctumVault",
      "ecosystemVault",
      "daoPayrollPool",
      "merchantPool",
      "headhunterPool",
      "systemHandover",
      "termLoan",
    ].includes(name)) {
      throw new Error(`Missing env var for ${name}`);
    }
  }

  // ══════════════════════════════════════════════
  //  0. SYSTEM HANDOVER ARMING ENFORCEMENT
  // ══════════════════════════════════════════════
  console.log("\n═══ 0. SystemHandover Arming ═══");

  if (!addrs.systemHandover) {
    if (requireSystemHandover) {
      throw new Error(
        "Missing SystemHandover address. Set NEXT_PUBLIC_SYSTEM_HANDOVER_ADDRESS or SYSTEM_HANDOVER_ADDRESS, " +
        "or set REQUIRE_SYSTEM_HANDOVER=false only for explicit local exceptions."
      );
    }
    console.log("  ⚠️  SystemHandover address not set; arming check skipped by REQUIRE_SYSTEM_HANDOVER=false");
  } else {
    const handover = await ethers.getContractAt("SystemHandover", addrs.systemHandover);
    const currentStart = await handover.start();

    if (currentStart === 0n) {
      let armTimestamp: bigint;
      if (process.env.HANDOVER_START_TIMESTAMP) {
        armTimestamp = BigInt(process.env.HANDOVER_START_TIMESTAMP);
        if (armTimestamp === 0n) {
          throw new Error("HANDOVER_START_TIMESTAMP must not be zero");
        }
      } else {
        const latestBlock = await ethers.provider.getBlock("latest");
        armTimestamp = BigInt(latestBlock!.timestamp);
      }

      await handover.arm(armTimestamp);
      console.log(`  ✅ SystemHandover.arm(${armTimestamp})`);
    } else {
      console.log(`  ✅ SystemHandover already armed at start=${currentStart}`);
    }
  }

  // ══════════════════════════════════════════════
  //  1. SINK WIRING (48h timelocks on token)
  // ══════════════════════════════════════════════
  console.log("\n═══ 1. Fee Sink Wiring ═══");

  const token = await ethers.getContractAt("VFIDEToken", addrs.token);

  // Set treasurySink → FeeDistributor (so ecosystem fees flow correctly)
  try {
    await token.setTreasurySink(addrs.feeDistributor);
    console.log("  ✅ TreasurySink → FeeDistributor proposed (48h)");
  } catch (e: any) {
    console.log("  ⏭️  setTreasurySink:", e.reason || e.message);
  }

  // Set sanctumSink (if SanctumVault deployed)
  if (addrs.sanctumVault) {
    try {
      await token.setSanctumSink(addrs.sanctumVault);
      console.log("  ✅ SanctumSink → SanctumVault proposed (48h)");
    } catch (e: any) {
      console.log("  ⏭️  setSanctumSink:", e.reason || e.message);
    }
  }

  // ══════════════════════════════════════════════
  //  2. BURNROUTER SINK WIRING (48h timelock)
  // ══════════════════════════════════════════════
  console.log("\n═══ 2. BurnRouter Sink Wiring ═══");

  const burnRouter = await ethers.getContractAt("ProofScoreBurnRouter", addrs.burnRouter);
  try {
    await burnRouter.proposeModules(
      addrs.seer,                               // _seer (keep same)
      addrs.sanctumVault || addrs.feeDistributor, // _sanctumSink
      ethers.ZeroAddress,                        // _burnSink (address(0) = hard burn)
      addrs.feeDistributor,                      // _ecosystemSink
    );
    console.log("  ✅ BurnRouter modules proposed (48h)");
  } catch (e: any) {
    console.log("  ⏭️  proposeModules:", e.reason || e.message);
  }

  // ══════════════════════════════════════════════
  //  3. DAO ROLE TRANSFERS (immediate where possible)
  // ══════════════════════════════════════════════
  console.log("\n═══ 3. DAO Role Transfers ═══");

  // Seer.setDAO → DAO contract (48h timelock on Seer)
  const seer = await ethers.getContractAt("Seer", addrs.seer);
  try {
    await seer.setDAO(addrs.dao);
    console.log("  ✅ Seer.setDAO → DAO proposed (48h)");
  } catch (e: any) {
    console.log("  ⏭️  Seer.setDAO:", e.reason || e.message);
  }

  // FraudRegistry.setDAO → DAO contract (immediate if deployer is current dao)
  const fraud = await ethers.getContractAt("FraudRegistry", addrs.fraudRegistry);
  try {
    await fraud.setDAO(addrs.dao);
    console.log("  ✅ FraudRegistry.setDAO → DAO");
  } catch (e: any) {
    console.log("  ⏭️  FraudRegistry.setDAO:", e.reason || e.message);
  }

  // GovernanceHooks.setDAO → DAO contract
  if (addrs.hooks) {
    const hooks = await ethers.getContractAt("GovernanceHooks", addrs.hooks);
    try {
      await hooks.setDAO(addrs.dao);
      console.log("  ✅ GovernanceHooks.setDAO → DAO");
    } catch (e: any) {
      console.log("  ⏭️  GovernanceHooks.setDAO:", e.reason || e.message);
    }
  }

  // MerchantPortal.setDAO -> DAO contract
  const merchantPortal = await ethers.getContractAt("MerchantPortal", addrs.merchantPortal);
  try {
    await merchantPortal.setDAO(addrs.dao);
    console.log("  ✅ MerchantPortal.setDAO -> DAO");
  } catch (e: any) {
    console.log("  ⏭️  MerchantPortal.setDAO:", e.reason || e.message);
  }

  // VFIDEFlashLoan — set dao
  if (addrs.flashLoan) {
    const flashLoan = await ethers.getContractAt("VFIDEFlashLoan", addrs.flashLoan);
    try {
      await flashLoan.setDAO(addrs.dao);
      console.log("  ✅ VFIDEFlashLoan.setDAO → DAO");
    } catch (e: any) {
      console.log("  ⏭️  VFIDEFlashLoan.setDAO:", e.reason || e.message);
    }
  }

  // VFIDETermLoan — set dao
  if (addrs.termLoan) {
    const termLoan = await ethers.getContractAt("VFIDETermLoan", addrs.termLoan);
    try {
      await termLoan.setDAO(addrs.dao);
      console.log("  ✅ VFIDETermLoan.setDAO → DAO");
    } catch (e: any) {
      console.log("  ⏭️  VFIDETermLoan.setDAO:", e.reason || e.message);
    }
  }

  // ══════════════════════════════════════════════
  //  4. DAO TIMELOCKED GOVERNANCE BOOTSTRAP
  //     (queue DAO-only calls while the deployer still controls timelock admin)
  // ══════════════════════════════════════════════
  console.log("\n═══ 4. DAO Timelock Bootstrap ═══");

  const timelock = await ethers.getContractAt("DAOTimelock", addrs.timelock);
  const dao = await ethers.getContractAt("DAO", addrs.dao);

  if (addrs.councilElection) {
    const setCouncilData = dao.interface.encodeFunctionData("setCouncilElection", [addrs.councilElection]);
    const syncQuorumData = dao.interface.encodeFunctionData("syncQuorumToCouncil", []);

    try {
      const setCouncilTxId = await timelock.queueTx(addrs.dao, 0, setCouncilData);
      console.log("  ✅ DAO.setCouncilElection(CouncilElection) queued");
      console.log(`     Execute after delay: timelock.execute(${setCouncilTxId})`);
    } catch (e: any) {
      console.log("  ⏭️  queueTx(setCouncilElection):", e.reason || e.message);
    }

    try {
      const syncQuorumTxId = await timelock.queueTx(addrs.dao, 0, syncQuorumData);
      console.log("  ✅ DAO.syncQuorumToCouncil() queued");
      console.log(`     Execute after delay: timelock.execute(${syncQuorumTxId})`);
    } catch (e: any) {
      console.log("  ⏭️  queueTx(syncQuorumToCouncil):", e.reason || e.message);
    }
  } else {
    console.log("  ⚠️  CouncilElection not provided — DAO council/quorum sync not queued");
  }

  // ══════════════════════════════════════════════
  //  5. DAOTIMELOCK ADMIN TRANSFER
  //     (self-referencing tx: timelock changes its own admin to DAO)
  // ══════════════════════════════════════════════
  console.log("\n═══ 5. DAOTimelock Admin → DAO ═══");

  const setAdminData = timelock.interface.encodeFunctionData("setAdmin", [addrs.dao]);
  try {
    const _txId = await timelock.queueTx(addrs.timelock, 0, setAdminData);
    console.log("  ✅ DAOTimelock.setAdmin(DAO) queued — wait for delay then execute");
    console.log("     Execute after delay: timelock.execute(txId)");
  } catch (e: any) {
    console.log("  ⏭️  queueTx(setAdmin):", e.reason || e.message);
  }

  // ══════════════════════════════════════════════
  //  6. OWNERSHIP TRANSFERS → ADMIN MULTISIG
  // ══════════════════════════════════════════════
  console.log("\n═══ 6. Ownership → AdminMultiSig ═══");

  if (!finalizeOwnershipTransfer) {
    console.log("  ⏭️  Skipped ownership transfer. Set FINALIZE_OWNERSHIP_TRANSFER=true only after all 48h applies are complete.");
  }

  async function transferOwnershipIfPossible(label: string, contractName: string, addr?: string) {
    if (!finalizeOwnershipTransfer) return;
    if (!addr) return;
    try {
      const c = await ethers.getContractAt(contractName, addr);
      await c.transferOwnership(addrs.adminMultisig);
      console.log(`  ✅ ${label}.transferOwnership → AdminMultiSig`);
    } catch (e: any) {
      console.log(`  ⏭️  ${label}.transferOwnership: ${e.reason || e.message}`);
    }
  }

  await transferOwnershipIfPossible("VFIDEToken", "VFIDEToken", addrs.token);
  await transferOwnershipIfPossible("VaultHub", "VaultHub", addrs.vaultHub);
  await transferOwnershipIfPossible("ProofScoreBurnRouter", "ProofScoreBurnRouter", addrs.burnRouter);
  await transferOwnershipIfPossible("EcosystemVault", "EcosystemVault", addrs.ecosystemVault);
  await transferOwnershipIfPossible("SanctumVault", "SanctumVault", addrs.sanctumVault);
  await transferOwnershipIfPossible("FeeDistributor", "FeeDistributor", addrs.feeDistributor);

  if (addrs.ocp) {
    console.log("  ℹ️  OCP is optional in this flow; AdminMultiSig is the canonical ownership target.");
  }

  // ══════════════════════════════════════════════
  //  7. FEEDISTRIBUTOR DESTINATIONS
  // ══════════════════════════════════════════════
  console.log("\n═══ 7. FeeDistributor Destinations ═══");

  const feeDist = await ethers.getContractAt("FeeDistributor", addrs.feeDistributor);

  const daoPayrollDestination = addrs.daoPayrollPool || addrs.ecosystemVault || deployer.address;
  const merchantPoolDestination = addrs.merchantPool || addrs.ecosystemVault || deployer.address;
  const headhunterPoolDestination = addrs.headhunterPool || addrs.ecosystemVault || deployer.address;

  const payoutPools = [
    ["daoPayroll", daoPayrollDestination],
    ["merchantPool", merchantPoolDestination],
    ["headhunterPool", headhunterPoolDestination],
  ] as const;

  const uniquePayoutPoolDestinations = new Set(payoutPools.map(([, addr]) => addr));
  if (!allowCommingledFeeDestinations && uniquePayoutPoolDestinations.size < payoutPools.length) {
    throw new Error(
      "Refusing to commingle FeeDistributor payout pools. Set NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS, " +
      "NEXT_PUBLIC_MERCHANT_POOL_ADDRESS, and NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS to distinct addresses, " +
      "or set ALLOW_COMMINGLED_FEE_DESTINATIONS=true for intentional temporary commingling."
    );
  }

  const destinations = [
    ["sanctum", addrs.sanctumVault || deployer.address],
    ["daoPayroll", daoPayrollDestination],
    ["merchantPool", merchantPoolDestination],
    ["headhunterPool", headhunterPoolDestination],
  ];

  for (const [name, addr] of destinations) {
    try {
      await feeDist.setDestination(name, addr);
      console.log(`  ✅ FeeDistributor.${name} → ${addr.slice(0, 10)}...`);
    } catch (e: any) {
      console.log(`  ⏭️  setDestination(${name}): ${e.reason || e.message}`);
    }
  }

  console.log("\n═══ SUMMARY ═══");
  console.log("Wait 48h then run apply scripts to confirm:");
  console.log("  - token.applyTreasurySink()");
  console.log("  - token.applySanctumSink()");
  console.log("  - burnRouter.applyModules()");
  console.log("  - seer.applyDAOChange()");
  if (addrs.councilElection) {
    console.log("  - timelock.execute(setCouncilElection txId)");
    console.log("  - timelock.execute(syncQuorumToCouncil txId)");
  }
  console.log("  - timelock.execute(setAdmin txId)");
  console.log("");
  console.log("⚠️  BEFORE MAINNET:");
  console.log("  - Ensure all ownership transfers above are accepted/finalized by AdminMultiSig");
  console.log("  - Deploy VaultRecoveryClaim → register as recovery approver");
  console.log("  - Deploy SanctumVault, EcosystemVault → update FeeDistributor destinations");
  console.log("  - Run SystemHandover after 6 months");
}

main().catch(console.error);
