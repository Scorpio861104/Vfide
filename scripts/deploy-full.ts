/**
 * VFIDE Full System Deployment
 *
 * Deploys ALL contracts across every phase in dependency order, wires them
 * together, and proposes the first batch of 48-hour timelocked operations.
 *
 * Run:
 *   npx hardhat run scripts/deploy-full.ts --network baseSepolia
 *
 * After 48 hours run apply-full.ts.  Re-run apply-full.ts every 48 hours
 * until it reports "All wiring complete."
 *
 * Addresses are saved to .deployments/<network>.json so apply-full.ts can
 * pick them up without re-reading .env.
 */

import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

const ethers = (hre as any).ethers;

type Book = Record<string, string>;

function readBook(network: string): Book {
  const fp = path.join(process.cwd(), ".deployments", `${network}.json`);
  return fs.existsSync(fp) ? (JSON.parse(fs.readFileSync(fp, "utf8")) as Book) : {};
}

function saveBook(network: string, book: Book): void {
  const dir = path.join(process.cwd(), ".deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${network}.json`),
    JSON.stringify(book, null, 2),
  );
}

/** Read constructor args from ARGS_<CONTRACTNAME> env var (JSON array). */
function envArgs(contractName: string): unknown[] {
  const key = `ARGS_${contractName.toUpperCase()}`;
  const raw = process.env[key];
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown[];
  if (!Array.isArray(parsed)) throw new Error(`${key} must be a JSON array`);
  return parsed;
}

function poolArgs(contractName: "DAOPayrollPool" | "MerchantCompetitionPool" | "HeadhunterCompetitionPool", tokenAddress: string, admin: string): unknown[] {
  const fromEnv = envArgs(contractName);
  if (fromEnv.length > 0) return fromEnv;

  if (contractName === "DAOPayrollPool") {
    return [tokenAddress, admin, 12, ethers.parseEther("500000")];
  }
  if (contractName === "MerchantCompetitionPool") {
    return [tokenAddress, admin, ethers.parseEther("500000"), 1_000_000];
  }
  return [tokenAddress, admin, ethers.parseEther("250000")];
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = process.env.HARDHAT_NETWORK ?? "hardhat";
  const book = readBook(network);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  VFIDE Full System Deployment             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  Network  : ${network}`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(
    `  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`,
  );

  // ─── helper: deploy + record ─────────────────────────────────────────────
  async function deploy(name: string, ...args: unknown[]) {
    if (book[name]) {
      console.log(`  ⏭  ${name} already in book (${book[name]}) — skipping`);
      return ethers.getContractAt(name, book[name]);
    }
    console.log(`\n  Deploying ${name}...`);
    const Factory = await ethers.getContractFactory(name);
    const contract = await Factory.deploy(...args);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    book[name] = addr;
    saveBook(network, book);
    console.log(`  ✅ ${name}: ${addr}`);
    return contract;
  }

  // ─── helper: safe call ────────────────────────────────────────────────────
  async function call(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      console.log(`  ✅ ${label}`);
    } catch (e: any) {
      console.log(`  ⏭  ${label}: ${e.reason ?? e.message?.slice(0, 80)}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 1: Foundation
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 1: Foundation ═══");

  await deploy("ProofLedger", deployer.address);

  await deploy(
    "DevReserveVestingVault",
    ethers.ZeroAddress,            // _vfide  (wired after token)
    deployer.address,              // _beneficiary
    ethers.ZeroAddress,            // _vaultHub (wired after)
    ethers.ZeroAddress,            // _ledger   (wired after)
    ethers.parseEther("50000000"), // _allocation: 50 M VFIDE
    deployer.address,              // _dao (temp; transfer to DAO later)
  );

  await deploy(
    "VFIDEToken",
    book.DevReserveVestingVault,
    deployer.address,   // treasury (receives 150 M)
    ethers.ZeroAddress, // _vaultHub (wired via timelock)
    book.ProofLedger,
    deployer.address,   // _treasurySink (temp)
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 2: Trust Engine
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 2: Trust Engine ═══");

  await deploy(
    "Seer",
    deployer.address,    // _dao (temp)
    book.ProofLedger,
    ethers.ZeroAddress,  // _hub (wired after VaultHub)
  );

  await deploy(
    "ProofScoreBurnRouter",
    book.Seer,
    deployer.address, // _sanctumSink (temp)
    deployer.address, // _burnSink (temp)
    deployer.address, // _ecosystemSink (temp)
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 3: Vault System
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 3: Vault System ═══");

  await deploy(
    "VaultHub",
    book.VFIDEToken,
    book.ProofLedger,
    deployer.address, // _dao (temp)
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 4: Commerce core
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 4: Commerce Core ═══");
  if (!book.VFIDEToken) {
    throw new Error("VFIDEToken address missing from deployment book before pool deployment");
  }

  await deploy(
    "DAOPayrollPool",
    ...poolArgs("DAOPayrollPool", book.VFIDEToken, deployer.address),
  );

  await deploy(
    "MerchantCompetitionPool",
    ...poolArgs("MerchantCompetitionPool", book.VFIDEToken, deployer.address),
  );

  await deploy(
    "HeadhunterCompetitionPool",
    ...poolArgs("HeadhunterCompetitionPool", book.VFIDEToken, deployer.address),
  );

  await deploy(
    "FeeDistributor",
    book.VFIDEToken,
    deployer.address, // _burn (temp)
    deployer.address, // _sanctum (temp)
    book.DAOPayrollPool,
    book.MerchantCompetitionPool,
    book.HeadhunterCompetitionPool,
    deployer.address, // _admin
  );

  await deploy(
    "MerchantPortal",
    deployer.address, // _dao (temp)
    book.VaultHub,
    book.Seer,
    book.ProofLedger,
    deployer.address, // _feeSink (temp)
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 5: Governance
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 5: Governance ═══");

  await deploy("DAOTimelock", deployer.address);

  await deploy(
    "GovernanceHooks",
    book.ProofLedger,
    book.Seer,
    deployer.address, // _dao (temp)
  );

  await deploy(
    "DAO",
    deployer.address, // _admin (temp)
    book.DAOTimelock,
    book.Seer,
    book.VaultHub,
    book.GovernanceHooks,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 6: Finance
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 6: Finance ═══");

  await deploy(
    "VFIDEFlashLoan",
    book.VFIDEToken,
    deployer.address, // _dao (temp)
    book.Seer,
    book.FeeDistributor,
  );

  await deploy(
    "VFIDETermLoan",
    book.VFIDEToken,
    deployer.address, // _dao (temp)
    book.Seer,
    book.VaultHub,
    book.FeeDistributor,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 7: Safety
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 7: Safety ═══");

  await deploy(
    "FraudRegistry",
    deployer.address, // _dao (temp)
    book.Seer,
    book.VFIDEToken,
  );

  await deploy(
    "VFIDETestnetFaucet",
    book.VFIDEToken,
    deployer.address,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 8: Governance / Admin helpers  (formerly phase 2)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 8: Governance Helpers ═══");

  for (const name of [
    "OwnerControlPanel",
    "VaultRecoveryClaim",
    "SystemHandover",
    "EmergencyControl",
    "AdminMultiSig",
  ] as const) {
    await deploy(name, ...envArgs(name));
  }

  if (book.VaultRecoveryClaim && book.VaultHub) {
    const hub = await ethers.getContractAt("VaultHub", book.VaultHub);
    await call("VaultHub.setRecoveryApprover(VaultRecoveryClaim)", () =>
      hub.setRecoveryApprover(book.VaultRecoveryClaim, true),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 9: Ecosystem vaults + badges  (formerly phase 3)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 9: Ecosystem / Badges ═══");

  for (const name of [
    "SanctumVault",
    "EcosystemVault",
    "EcosystemVaultView",
    "VaultRegistry",
    "PayrollManager",
    "LiquidityIncentives",
  ] as const) {
    await deploy(name, ...envArgs(name));
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 11: Commerce suite  (formerly phase 5)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 11: Commerce Suite ═══");

  for (const name of [
    "MerchantRegistry",
    "CommerceEscrow",
  ] as const) {
    await deploy(name, ...envArgs(name));
  }

  if (book.MerchantRegistry) book.VFIDECommerce = book.MerchantRegistry;

  saveBook(network, book);

  // ══════════════════════════════════════════════════════════════════════════
  //  IMMEDIATE WIRING (no timelock)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Immediate Wiring ═══");

  // ProofLedger — register all known loggers
  const ledger = await ethers.getContractAt("ProofLedger", book.ProofLedger);
  const loggers: Array<[string, string | undefined]> = [
    ["VFIDEToken",           book.VFIDEToken],
    ["VaultHub",             book.VaultHub],
    ["Seer",                 book.Seer],
    ["MerchantPortal",       book.MerchantPortal],
    ["DAOTimelock",          book.DAOTimelock],
    ["GovernanceHooks",      book.GovernanceHooks],
    ["FraudRegistry",        book.FraudRegistry],
    ["VFIDEFlashLoan",       book.VFIDEFlashLoan],
    ["VFIDETermLoan",        book.VFIDETermLoan],
    ["DAOPayrollPool",       book.DAOPayrollPool],
    ["MerchantCompetitionPool", book.MerchantCompetitionPool],
    ["HeadhunterCompetitionPool", book.HeadhunterCompetitionPool],
    ["MerchantRegistry",     book.MerchantRegistry],
    ["CommerceEscrow",       book.CommerceEscrow],
  ];
  for (const [name, addr] of loggers) {
    if (!addr) continue;
    await call(`ProofLedger.setLogger(${name})`, () => ledger.setLogger(addr, true));
  }

  // GovernanceHooks → DAO
  const hooks = await ethers.getContractAt("GovernanceHooks", book.GovernanceHooks);
  await call("GovernanceHooks.setDAO → DAO", () => hooks.setDAO(book.DAO));

  // FraudRegistry → DAO
  const fraud = await ethers.getContractAt("FraudRegistry", book.FraudRegistry);
  await call("FraudRegistry.setDAO → DAO", () => fraud.setDAO(book.DAO));

  // MerchantPortal → DAO
  const merchant = await ethers.getContractAt("MerchantPortal", book.MerchantPortal);
  await call("MerchantPortal.setDAO → DAO", () => merchant.setDAO(book.DAO));

  // VFIDEFlashLoan → DAO
  const flash = await ethers.getContractAt("VFIDEFlashLoan", book.VFIDEFlashLoan);
  await call("VFIDEFlashLoan.setDAO → DAO", () => flash.setDAO(book.DAO));

  // VFIDETermLoan → DAO
  const term = await ethers.getContractAt("VFIDETermLoan", book.VFIDETermLoan);
  await call("VFIDETermLoan.setDAO → DAO", () => term.setDAO(book.DAO));

  // MerchantRegistry ↔ CommerceEscrow
  if (book.MerchantRegistry && book.CommerceEscrow) {
    const registry = await ethers.getContractAt("MerchantRegistry", book.MerchantRegistry);
    await call("MerchantRegistry.setAuthorizedEscrow → CommerceEscrow", () =>
      registry.setAuthorizedEscrow(book.CommerceEscrow),
    );
  }

  // Seer module wiring
  const seer = await ethers.getContractAt("Seer", book.Seer);

  // ══════════════════════════════════════════════════════════════════════════
  //  TIMELOCKED PROPOSALS  (48-hour; confirmed via apply-full.ts)
  //  Note: VFIDEToken system exemptions are serialised — only ONE may be
  //  pending at a time.  Remaining exemptions are proposed in apply-full.ts.
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ Timelocked Proposals (48h — confirm via apply-full.ts) ═══");

  const token = await ethers.getContractAt("VFIDEToken", book.VFIDEToken);

  await call("Token.setVaultHub (proposal)", () => token.setVaultHub(book.VaultHub));
  await call("Token.setBurnRouter (proposal)", () => token.setBurnRouter(book.ProofScoreBurnRouter));
  await call("Token.setFraudRegistry (proposal)", () => token.setFraudRegistry(book.FraudRegistry));

  // Seer.setDAO — 48h timelock
  await call("Seer.setDAO → DAO (proposal)", () => seer.setDAO(book.DAO));

  // First system-exempt proposal: FeeDistributor
  await call("Token.proposeSystemExempt(FeeDistributor) — round 1", () =>
    token.proposeSystemExempt(book.FeeDistributor, true),
  );

  saveBook(network, book);

  // ══════════════════════════════════════════════════════════════════════════
  //  OUTPUT
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ ALL DEPLOYED ADDRESSES ═══");
  for (const [name, addr] of Object.entries(book)) {
    console.log(`  ${name}: ${addr}`);
  }

  console.log("\n═══ .env BLOCK ═══");
  const envPairs: Array<[string, string | undefined]> = [
    ["NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS",        book.VFIDEToken],
    ["NEXT_PUBLIC_VAULT_HUB_ADDRESS",          book.VaultHub],
    ["NEXT_PUBLIC_SEER_ADDRESS",               book.Seer],
    ["NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS",    book.MerchantPortal],
    ["NEXT_PUBLIC_BURN_ROUTER_ADDRESS",        book.ProofScoreBurnRouter],
    ["NEXT_PUBLIC_DAO_ADDRESS",                book.DAO],
    ["NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS",       book.DAOTimelock],
    ["NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS",     book.FraudRegistry],
    ["NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS",    book.FeeDistributor],
    ["NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS",   book.DAOPayrollPool],
    ["NEXT_PUBLIC_MERCHANT_POOL_ADDRESS",      book.MerchantCompetitionPool],
    ["NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS",    book.HeadhunterCompetitionPool],
    ["NEXT_PUBLIC_FAUCET_ADDRESS",             book.VFIDETestnetFaucet],
    ["NEXT_PUBLIC_PROOF_LEDGER_ADDRESS",       book.ProofLedger],
    ["NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS",   book.GovernanceHooks],
    ["NEXT_PUBLIC_FLASH_LOAN_ADDRESS",         book.VFIDEFlashLoan],
    ["NEXT_PUBLIC_TERM_LOAN_ADDRESS",          book.VFIDETermLoan],
    ["NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS",     book.VFIDECommerce],
    ["NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS",    book.CommerceEscrow],
    ["NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS",     book.VaultRegistry],
    ["NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS",book.OwnerControlPanel],
    ["NEXT_PUBLIC_ADMIN_MULTISIG_ADDRESS",     book.AdminMultiSig],
    ["NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS",      book.SanctumVault],
    ["NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS",    book.EcosystemVault],
  ];
  for (const [key, val] of envPairs) {
    if (val) console.log(`${key}=${val}`);
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  DEPLOYMENT COMPLETE                                         ║");
  console.log("║                                                              ║");
  console.log("║  The on-chain 48-hour timelocks are now counting down.       ║");
  console.log("║  After 48 hours run:                                         ║");
  console.log("║    npx hardhat run scripts/apply-full.ts --network <net>     ║");
  console.log("║  Re-run apply-full.ts every 48h until it reports             ║");
  console.log("║  'All wiring complete.'                                      ║");
  console.log("║                                                              ║");
  console.log("║  ⚠  Transfer all contract ownership to multisig before       ║");
  console.log("║     mainnet announcement.                                    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);
