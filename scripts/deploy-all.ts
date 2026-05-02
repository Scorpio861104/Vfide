/**
 * VFIDE Unified Deployment Script
 * 
 * Deploys ALL contracts in dependency order and wires them together.
 * Run: npx hardhat run scripts/deploy-all.ts --network baseSepolia
 * 
 * IMPORTANT: All module setters use 48h timelocks.
 * After deploy, wait 48h then run: npx hardhat run scripts/apply-all.ts --network baseSepolia
 */

import hre from "hardhat";

const ethers = (hre as any).ethers;
const TESTNET_CHAIN_IDS = new Set([31337, 84532, 11155111, 80002]);
const EIP170_RUNTIME_LIMIT = 24_576;

const DEPLOYMENT_CONTRACTS = [
  "ProofLedger",
  "DevReserveVestingVault",
  "VFIDEToken",
  "Seer",
  "ProofScoreBurnRouter",
  "VaultHub",
  "DAOPayrollPool",
  "MerchantCompetitionPool",
  "HeadhunterCompetitionPool",
  "FeeDistributor",
  "MerchantPortal",
  "DAOTimelock",
  "GovernanceHooks",
  "DAO",
  "VFIDEFlashLoan",
  "VFIDETermLoan",
  "FraudRegistry",
  "VFIDETestnetFaucet",
] as const;

function byteLength(hexData: string | undefined): number {
  if (!hexData || hexData === '0x') return 0;
  return Math.max(0, (hexData.length - 2) / 2);
}

async function assertDeploymentBytecodeLimits(contractNames: readonly string[]): Promise<void> {
  const oversized: Array<{ name: string; runtimeBytes: number }> = [];

  for (const name of contractNames) {
    const artifact = await hre.artifacts.readArtifact(name);
    const runtimeBytes = byteLength(artifact.deployedBytecode);
    if (runtimeBytes > EIP170_RUNTIME_LIMIT) {
      oversized.push({ name, runtimeBytes });
    }
  }

  if (oversized.length === 0) {
    return;
  }

  const details = oversized
    .map((item) => `${item.name}: ${item.runtimeBytes} bytes`)
    .join(', ');

  throw new Error(
    `Deployment blocked: EIP-170 runtime limit (${EIP170_RUNTIME_LIMIT} bytes) exceeded by ${details}. ` +
    'Run contract-size verification and shrink oversized contracts before deployment.'
  );
}

function parseBooleanEnv(value: string | undefined): boolean {
  return (value || '').trim().toLowerCase() === 'true';
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const isTestnetChain = TESTNET_CHAIN_IDS.has(chainId);
  const deployTestnetFaucet = parseBooleanEnv(process.env.DEPLOY_TESTNET_FAUCET);

  if (deployTestnetFaucet && !isTestnetChain) {
    throw new Error(
      `DEPLOY_TESTNET_FAUCET=true is not allowed on chainId ${chainId}. ` +
      'Disable DEPLOY_TESTNET_FAUCET for production/mainnet deployments.'
    );
  }

  console.log("Deploying with:", deployer.address);
  console.log("Chain ID:", chainId);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // #306 guard: VFIDEToken constructor requires treasury to be a deployed contract.
  const treasuryAddress = requiredEnv('TREASURY_ADDRESS');
  const treasuryCode = await ethers.provider.getCode(treasuryAddress);
  if (!treasuryCode || treasuryCode === '0x') {
    throw new Error(`TREASURY_ADDRESS must be a deployed contract address. Received non-contract: ${treasuryAddress}`);
  }

  const contractSet = deployTestnetFaucet
    ? DEPLOYMENT_CONTRACTS
    : DEPLOYMENT_CONTRACTS.filter((name) => name !== 'VFIDETestnetFaucet');
  await assertDeploymentBytecodeLimits(contractSet);
  console.log("Bytecode size preflight: all deployment contracts are within EIP-170 runtime limit.");
  
  const deployed: Record<string, string> = {};
  
  async function deploy(name: string, ...args: any[]) {
    console.log(`\n  Deploying ${name}...`);
    const Factory = await ethers.getContractFactory(name);
    const contract = await Factory.deploy(...args);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    deployed[name] = addr;
    console.log(`  ✅ ${name}: ${addr}`);
    return contract;
  }
  
  // ══════════════════════════════════════════════
  //  LAYER 1: Foundation
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 1: Foundation ═══");
  
  // ProofLedger(admin)
  await deploy("ProofLedger",
    deployer.address,             // admin
  );
  
  // DevReserveVestingVault(vfide, beneficiary, vaultHub, ledger, allocation, dao)
  // vfide and vaultHub are zero at deploy — wired after token exists
  await deploy("DevReserveVestingVault",
    ethers.ZeroAddress,           // _vfide (set after token deploy)
    deployer.address,             // _beneficiary
    ethers.ZeroAddress,           // _vaultHub (set after)
    ethers.ZeroAddress,           // _ledger (set after)
    ethers.parseEther("50000000"),// _allocation (50M VFIDE)
    deployer.address,             // _dao (temp, transfer to DAO later)
  );
  
  // VFIDEToken(devReserve, treasury, vaultHub, ledger, treasurySink)
  await deploy("VFIDEToken",
    deployed.DevReserveVestingVault, // devReserveVestingVault
    treasuryAddress,                 // treasury (receives 150M)
    ethers.ZeroAddress,              // _vaultHub (set after via timelock)
    deployed.ProofLedger,            // _ledger
    deployer.address,                // _treasurySink (temp, update later)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 2: Trust Engine
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 2: Trust Engine ═══");
  
  // Seer(dao, ledger, hub)
  await deploy("Seer",
    deployer.address,             // _dao (temp)
    deployed.ProofLedger,         // _ledger
    ethers.ZeroAddress,           // _hub (set after VaultHub)
  );
  
  // ProofScoreBurnRouter(seer, sanctumSink, burnSink, ecosystemSink)
  await deploy("ProofScoreBurnRouter",
    deployed.Seer,                // _seer
    deployer.address,             // _sanctumSink (temp)
    deployer.address,             // _burnSink (temp)
    deployer.address,             // _ecosystemSink (temp)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 3: Vault System
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 3: Vault System ═══");
  
  // VaultHub(vfideToken, ledger, dao)
  await deploy("VaultHub",
    deployed.VFIDEToken,          // _vfideToken
    deployed.ProofLedger,         // _ledger
    deployer.address,             // _dao (temp)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 4: Commerce
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 4: Commerce ═══");

  // DAOPayrollPool(token, admin, initialMaxMembers, maxPayoutPerPeriod)
  await deploy("DAOPayrollPool",
    deployed.VFIDEToken,
    deployer.address,
    12,
    ethers.parseEther("500000"),
  );

  // MerchantCompetitionPool(token, admin, maxPayoutPerPeriod, minTransactionSize)
  await deploy("MerchantCompetitionPool",
    deployed.VFIDEToken,
    deployer.address,
    ethers.parseEther("500000"),
    1_000_000,
  );

  // HeadhunterCompetitionPool(token, admin, maxPayoutPerPeriod)
  await deploy("HeadhunterCompetitionPool",
    deployed.VFIDEToken,
    deployer.address,
    ethers.parseEther("250000"),
  );
  
  // FeeDistributor(token, burn, sanctum, daoPayroll, merchantPool, headhunterPool, admin)
  await deploy("FeeDistributor",
    deployed.VFIDEToken,          // _token
    deployer.address,             // _burn (temp)
    deployer.address,             // _sanctum (temp)
    deployed.DAOPayrollPool,      // _daoPayroll
    deployed.MerchantCompetitionPool, // _merchantPool
    deployed.HeadhunterCompetitionPool, // _headhunterPool
    deployer.address,             // _admin
  );

  // MerchantPortal(dao, vaultHub, seer, ledger, feeSink)
  await deploy("MerchantPortal",
    deployer.address,             // _dao (temp)
    deployed.VaultHub,            // _vaultHub
    deployed.Seer,                // _seer
    deployed.ProofLedger,         // _ledger
    deployer.address,             // _feeSink (temp)
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 5: Governance
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 5: Governance ═══");
  
  // DAOTimelock(admin)
  await deploy("DAOTimelock",
    deployer.address,             // _admin
  );

  // GovernanceHooks(ledger, seer, dao)
  await deploy("GovernanceHooks",
    deployed.ProofLedger,         // _ledger
    deployed.Seer,                // _seer
    deployer.address,             // _dao (temp)
  );
  
  // DAO(admin, timelock, seer, hub, hooks)
  await deploy("DAO",
    deployer.address,             // _admin (temp)
    deployed.DAOTimelock,         // _timelock
    deployed.Seer,                // _seer
    deployed.VaultHub,            // _hub
    deployed.GovernanceHooks,     // _hooks
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 6: Finance
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 6: Finance ═══");

  // VFIDEFlashLoan(vfideToken, dao, seer, feeDistributor)
  await deploy("VFIDEFlashLoan",
    deployed.VFIDEToken,          // _vfideToken
    deployer.address,             // _dao (temp)
    deployed.Seer,                // _seer
    deployed.FeeDistributor,      // _feeDistributor
  );

  // VFIDETermLoan(token, dao, seer, vaultHub, feeDist)
  await deploy("VFIDETermLoan",
    deployed.VFIDEToken,          // _token
    deployer.address,             // _dao (temp)
    deployed.Seer,                // _seer
    deployed.VaultHub,            // _vaultHub
    deployed.FeeDistributor,      // _feeDist
  );
  
  // ══════════════════════════════════════════════
  //  LAYER 7: Safety
  // ══════════════════════════════════════════════
  console.log("\n═══ LAYER 7: Safety ═══");
  
  // FraudRegistry(dao, seer, vfideToken)
  await deploy("FraudRegistry",
    deployer.address,             // _dao (temp)
    deployed.Seer,                // _seer
    deployed.VFIDEToken,          // _vfideToken
  );
  
  // VFIDETestnetFaucet(vfideToken, owner) — testnet only and explicit opt-in
  if (isTestnetChain && deployTestnetFaucet) {
    await deploy("VFIDETestnetFaucet",
      deployed.VFIDEToken,          // _vfideToken
      deployer.address,             // _owner
    );
  } else {
    deployed.VFIDETestnetFaucet = ethers.ZeroAddress;
    console.log("  ⏭️  Skipping VFIDETestnetFaucet deployment (testnet + DEPLOY_TESTNET_FAUCET=true required)");
  }
  
  // ══════════════════════════════════════════════
  //  WIRING (48h timelocks — these are proposals)
  // ══════════════════════════════════════════════
  console.log("\n═══ WIRING (proposals — apply after 48h) ═══");
  
  const tokenContract = await ethers.getContractAt("VFIDEToken", deployed.VFIDEToken);
  
  // Token module proposals (48h timelocks)
  await tokenContract.setVaultHub(deployed.VaultHub);
  console.log("  Proposed: VaultHub → Token");
  
  await tokenContract.setBurnRouter(deployed.ProofScoreBurnRouter);
  console.log("  Proposed: BurnRouter → Token");
  
  await tokenContract.setFraudRegistry(deployed.FraudRegistry);
  console.log("  Proposed: FraudRegistry → Token");
  
  // System exemptions (48h timelock each — only ONE can be pending at a time)
  // Propose FeeDistributor first; apply-all.ts will confirm then propose the next
  await tokenContract.proposeSystemExempt(deployed.FeeDistributor, true);
  console.log("  Proposed: FeeDistributor as systemExempt (confirm in apply-all, then propose next)");
  
  // NOTE: FraudRegistry and FlashLoan must also be systemExempt.
  // FraudRegistry: without it, releaseEscrow() transfers will charge fees and re-escrow.
  // FlashLoan: without it, flash loan repayment transfers will charge fees.
  // These are proposed sequentially in apply-all.ts after each prior exemption is confirmed.

  // ══════════════════════════════════════════════
  //  PROOF LEDGER — Register authorized loggers
  //  F-1 FIX: Without this, ALL event logging silently fails
  // ══════════════════════════════════════════════
  console.log("\n═══ ProofLedger Logger Registration ═══");

  const ledger = await ethers.getContractAt("ProofLedger", deployed.ProofLedger);
  const loggers = [
    ["VFIDEToken", deployed.VFIDEToken],
    ["VaultHub", deployed.VaultHub],
    ["Seer", deployed.Seer],
    ["MerchantPortal", deployed.MerchantPortal],
    ["DAOTimelock", deployed.DAOTimelock],
    ["GovernanceHooks", deployed.GovernanceHooks],
    ["FraudRegistry", deployed.FraudRegistry],
    ["VFIDEFlashLoan", deployed.VFIDEFlashLoan],
    ["VFIDETermLoan", deployed.VFIDETermLoan],
    ["DAOPayrollPool", deployed.DAOPayrollPool],
    ["MerchantCompetitionPool", deployed.MerchantCompetitionPool],
    ["HeadhunterCompetitionPool", deployed.HeadhunterCompetitionPool],
  ];

  for (const [name, addr] of loggers) {
    try {
      await ledger.setLogger(addr, true);
      console.log(`  ✅ ${name} registered as logger`);
    } catch (e: any) {
      console.log(`  ⏭️  ${name}: ${(e as Error).message?.slice(0, 60)}`);
    }
  }
  // NOTE: CardBoundVault addresses are created dynamically via CREATE2.
  // Individual vaults cannot be pre-registered. Vault logging uses try/catch
  // and emits on-chain events directly — ProofLedger logging is best-effort.
  // Register additional contracts (SanctumVault, EcosystemVault, etc.) after deployment.

  // ══════════════════════════════════════════════
  //  DAO ROLE TRANSFERS (immediate)
  // ══════════════════════════════════════════════
  console.log("\n═══ DAO Role Transfers ═══");

  // GovernanceHooks → DAO
  const hooks = await ethers.getContractAt("GovernanceHooks", deployed.GovernanceHooks);
  try {
    await hooks.setDAO(deployed.DAO);
    console.log("  ✅ GovernanceHooks.dao → DAO");
  } catch (e: any) {
    console.log("  ⏭️  GovernanceHooks.setDAO:", (e as Error).message?.slice(0, 60));
  }

  // FraudRegistry → DAO
  const fraudContract = await ethers.getContractAt("FraudRegistry", deployed.FraudRegistry);
  try {
    await fraudContract.setDAO(deployed.DAO);
    console.log("  ✅ FraudRegistry.dao → DAO");
  } catch (e: any) {
    console.log("  ⏭️  FraudRegistry.setDAO:", (e as Error).message?.slice(0, 60));
  }

  // MerchantPortal → DAO (F-5 FIX: now has setDAO)
  const merchantContract = await ethers.getContractAt("MerchantPortal", deployed.MerchantPortal);
  try {
    await merchantContract.setDAO(deployed.DAO);
    console.log("  ✅ MerchantPortal.dao → DAO");
  } catch (e: any) {
    console.log("  ⏭️  MerchantPortal.setDAO:", (e as Error).message?.slice(0, 60));
  }

  // VFIDEFlashLoan → DAO
  const flashLoan = await ethers.getContractAt("VFIDEFlashLoan", deployed.VFIDEFlashLoan);
  try {
    await flashLoan.setDAO(deployed.DAO);
    console.log("  ✅ VFIDEFlashLoan.dao → DAO");
  } catch (e: any) {
    console.log("  ⏭️  VFIDEFlashLoan.setDAO:", (e as Error).message?.slice(0, 60));
  }

  // VFIDETermLoan → DAO
  const termLoan = await ethers.getContractAt("VFIDETermLoan", deployed.VFIDETermLoan);
  try {
    await termLoan.setDAO(deployed.DAO);
    console.log("  ✅ VFIDETermLoan.dao → DAO");
  } catch (e: any) {
    console.log("  ⏭️  VFIDETermLoan.setDAO:", (e as Error).message?.slice(0, 60));
  }

  // Seer.setDAO uses 48h timelock — proposed here, confirmed in transfer-governance.ts
  const seerContract = await ethers.getContractAt("Seer", deployed.Seer);
  try {
    await seerContract.setDAO(deployed.DAO);
    console.log("  ✅ Seer.setDAO → DAO proposed (48h timelock, confirm via seer.applyDAOChange())");
  } catch (e: any) {
    console.log("  ⏭️  Seer.setDAO:", (e as Error).message?.slice(0, 60));
  }

  // DAOTimelock admin transfer requires self-referencing queue tx
  // Done in transfer-governance.ts after timelock delay is known
  console.log("  ⚠️  DAOTimelock.admin transfer → run scripts/transfer-governance.ts");

  // ══════════════════════════════════════════════
  //  IMPORTANT: Deploy these separately before mainnet
  // ══════════════════════════════════════════════
  // - OwnerControlPanel (governance post-handover)
  // - VaultRecoveryClaim (guardian recovery) + register: vaultHub.setRecoveryApprover(addr, true)
  // - SanctumVault, EcosystemVault, SeerAutonomous, SeerGuardian
  // - CouncilElection, CouncilManager, CouncilSalary
  // - SystemHandover, EmergencyControl, VaultRegistry
  // - BadgeManager, VFIDEBadgeNFT, SeerSocial, SeerWorkAttestation

  // ══════════════════════════════════════════════
  //  OUTPUT
  // ══════════════════════════════════════════════
  console.log("\n═══ DEPLOYED ADDRESSES ═══");
  for (const [name, addr] of Object.entries(deployed)) {
    console.log(`  ${name}: ${addr}`);
  }
  
  console.log("\n═══ .env VALUES ═══");
  console.log(`NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS=${deployed.VFIDEToken}`);
  console.log(`NEXT_PUBLIC_VAULT_HUB_ADDRESS=${deployed.VaultHub}`);
  console.log(`NEXT_PUBLIC_SEER_ADDRESS=${deployed.Seer}`);
  console.log(`NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS=${deployed.MerchantPortal}`);
  console.log(`NEXT_PUBLIC_BURN_ROUTER_ADDRESS=${deployed.ProofScoreBurnRouter}`);
  console.log(`NEXT_PUBLIC_DAO_ADDRESS=${deployed.DAO}`);
  console.log(`NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS=${deployed.DAOTimelock}`);
  console.log(`NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS=${deployed.FraudRegistry}`);
  console.log(`NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=${deployed.FeeDistributor}`);
  console.log(`NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS=${deployed.DAOPayrollPool}`);
  console.log(`NEXT_PUBLIC_MERCHANT_POOL_ADDRESS=${deployed.MerchantCompetitionPool}`);
  console.log(`NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS=${deployed.HeadhunterCompetitionPool}`);
  console.log(`NEXT_PUBLIC_FAUCET_ADDRESS=${deployed.VFIDETestnetFaucet}`);
  console.log(`NEXT_PUBLIC_PROOF_LEDGER_ADDRESS=${deployed.ProofLedger}`);
  console.log(`NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS=${deployed.GovernanceHooks}`);
  console.log(`NEXT_PUBLIC_FLASH_LOAN_ADDRESS=${deployed.VFIDEFlashLoan}`);
  console.log(`NEXT_PUBLIC_TERM_LOAN_ADDRESS=${deployed.VFIDETermLoan}`);
  
  console.log("\n⚠️  IMPORTANT: Wait 48 hours, then run apply-all.ts to finalize wiring.");
  console.log("⚠️  IMPORTANT: Transfer ownership to multisig before mainnet announcement.");
}

main().catch(console.error);
