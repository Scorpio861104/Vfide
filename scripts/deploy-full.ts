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

async function resolveEthers(): Promise<any> {
  const runtime = hre as any;
  if (runtime.ethers) {
    return runtime.ethers;
  }
  if (runtime.network?.connect) {
    const connection = await runtime.network.connect();
    if (connection?.ethers) {
      return connection.ethers;
    }
  }
  throw new Error("Hardhat ethers runtime is unavailable. Ensure @nomicfoundation/hardhat-ethers is enabled.");
}

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

function poolArgs(
  ethers: any,
  contractName: "DAOPayrollPool" | "MerchantCompetitionPool" | "HeadhunterCompetitionPool",
  tokenAddress: string,
  admin: string,
): unknown[] {
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

function isLocalBootstrapNetwork(network: string): boolean {
  return network === "hardhat" || network === "localhost" || network === "local";
}

/**
 * Testnet chain IDs that match VFIDETestnetFaucet's internal allowlist.
 * Keep in sync with `_isSupportedTestnetChain` in
 * `contracts/testnet/VFIDETestnetFaucet.sol`.
 */
const TESTNET_CHAIN_IDS = new Set<number>([
  31337,    // Hardhat / local
  84532,    // Base Sepolia
  80002,    // Polygon Amoy
  300,      // zkSync Sepolia
  11155111, // Ethereum Sepolia
  421614,   // Arbitrum Sepolia
  11155420, // Optimism Sepolia
]);

function parseBooleanEnv(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

// ─── EIP-170 runtime-bytecode preflight (ported from deleted deploy-all.ts) ──
// Fails the deploy *before* any tx is sent if any deployable contract has a
// runtime bytecode > 24,576 bytes. Catches "code too large" deploy failures
// at preflight time instead of mid-deploy after gas burn. Sentinel strings
// here are load-bearing for __tests__/security/deploy-bytecode-guard.test.ts.
const EIP170_RUNTIME_LIMIT = 24_576;

/**
 * Contracts deployed by deploy-full.ts that must satisfy EIP-170. Kept in
 * sync with the `await deploy("…")` calls below across Layers 1-11.
 * VFIDETestnetFaucet is added at runtime only when DEPLOY_TESTNET_FAUCET=true.
 */
const DEPLOYMENT_CONTRACTS = [
  // Layer 1 — Foundation
  "AdminMultiSig",
  "ProofLedger",
  "DevReserveVestingVault",
  "VFIDEToken",
  "VFIDETokenViewer",
  // Layer 2 — Trust Engine
  "Seer",
  "ProofScoreBurnRouter",
  // Layer 3 — Vault System
  "CardBoundVaultAdminFacet",
  "CardBoundVaultSubManagerDeployer",
  "CardBoundVaultBytecodeProvider",
  "CardBoundVaultDeployer",
  "VaultHub",
  // Layer 4 — Commerce Core
  "DAOPayrollPool",
  "MerchantCompetitionPool",
  "HeadhunterCompetitionPool",
  "FeeDistributor",
  "MerchantPortal",
  "MerchantPortalViewer",
  // Layer 5 — Governance
  "DAOTimelock",
  "GovernanceHooks",
  "DAO",
  // Layer 6 — Finance
  "VFIDEFlashLoan",
  "VFIDETermLoan",
  "VFIDEPriceOracle",
  // Layer 7 — Safety
  "FraudRegistry",
  // Layer 8 — Governance Helpers
  "VFIDEAccessControl",
  "OwnerControlPanel",
  "VaultRecoveryClaim",
  "SystemHandover",
  "EmergencyControl",
  // Layer 9 — Ecosystem / Badges
  "SanctumVault",
  "EcosystemVaultAdminFacet",
  "EcosystemVault",
  "EcosystemVaultView",
  "VaultRegistry",
  "PayrollManager",
  "LiquidityIncentives",
  // Layer 11 — Commerce Suite
  "MerchantRegistry",
  "CommerceEscrow",
  "SubscriptionManager",
  // Layer 12 — Ecosystem Satellites (promoted from contracts/future/ 2026-05-27)
  "BadgeManager",
  "VFIDEBadgeNFT",
  "CouncilElection",
  "CouncilSalary",
  "SeerAutonomousAdminFacet",
  "SeerAutonomous",
  "SeerGuardian",
  "SeerPolicyGuard",
  "SeerSocial",
  "SeerWorkAttestation",
  "VFIDEBenefits",
  "VFIDEEnterpriseGateway",
  "MainstreamPayments",
] as const;

function byteLength(hexData: string | undefined): number {
  if (!hexData || hexData === "0x") return 0;
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
  if (oversized.length === 0) return;
  const details = oversized
    .map((item) => `${item.name}: ${item.runtimeBytes} bytes`)
    .join(", ");
  throw new Error(
    `Deployment blocked: EIP-170 runtime limit (${EIP170_RUNTIME_LIMIT} bytes) exceeded by ${details}. ` +
    "Run contract-size verification and shrink oversized contracts before deployment.",
  );
}

async function main() {
  const ethers = await resolveEthers();
  const [deployer] = await ethers.getSigners();
  const network = process.env.HARDHAT_NETWORK ?? "hardhat";
  const book = readBook(network);
  const provider = ethers.provider;
  const chainId = Number((await provider.getNetwork()).chainId);
  const isTestnetChain = TESTNET_CHAIN_IDS.has(chainId);
  const deployTestnetFaucet = parseBooleanEnv(process.env.DEPLOY_TESTNET_FAUCET);

  // ── 2026-05-20 mainnet-readiness gate ─────────────────────────────────────
  // On any mainnet chain (Base 8453, Polygon 137, zkSync 324) the static
  // readiness sweep MUST pass before a single transaction is sent. This
  // re-runs the same checks executed by .github/workflows/mainnet-readiness.yml
  // so a developer cannot bypass the CI gate by deploying from a stale branch.
  const MAINNET_CHAIN_IDS = new Set<number>([8453, 137, 324]);
  if (MAINNET_CHAIN_IDS.has(chainId)) {
    const { execFileSync } = await import("node:child_process");
    try {
      execFileSync("node", ["scripts/mainnet-readiness.cjs"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    } catch (_err) {
      throw new Error(
        "Mainnet readiness sweep FAILED. Refusing to deploy to a mainnet chainId. " +
        "Fix the failing checks (see output above) and re-run.",
      );
    }
  }


  if (deployTestnetFaucet && !isTestnetChain) {
    throw new Error(
      `DEPLOY_TESTNET_FAUCET=true is not allowed on chainId ${chainId}. ` +
      `Disable DEPLOY_TESTNET_FAUCET for production/mainnet deployments.`,
    );
  }
  const allowTemporaryDeployerBootstrap =
    process.env.ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP === "true" ||
    isLocalBootstrapNetwork(network);

  function bootstrapAddress(envKey: string, label: string): string {
    const configured = process.env[envKey]?.trim();
    if (configured) return configured;
    if (allowTemporaryDeployerBootstrap) return deployer.address;
    throw new Error(
      `${label} is required for non-local deployment. Set ${envKey} explicitly, or set ` +
      `ALLOW_TEMPORARY_DEPLOYER_BOOTSTRAP=true only for deliberate local/testing exceptions.`
    );
  }

  const bootstrap = {
    admin: bootstrapAddress("BOOTSTRAP_ADMIN_ADDRESS", "Bootstrap admin address"),
    dao: bootstrapAddress("BOOTSTRAP_DAO_ADDRESS", "Bootstrap DAO address"),
    beneficiary: bootstrapAddress("BOOTSTRAP_BENEFICIARY_ADDRESS", "Dev reserve beneficiary"),
    treasurySink: bootstrapAddress("BOOTSTRAP_TREASURY_SINK_ADDRESS", "Bootstrap treasury sink"),
    sanctumSink: bootstrapAddress("BOOTSTRAP_SANCTUM_SINK_ADDRESS", "Bootstrap sanctum sink"),
    burnSink: bootstrapAddress("BOOTSTRAP_BURN_SINK_ADDRESS", "Bootstrap burn sink"),
    ecosystemSink: bootstrapAddress("BOOTSTRAP_ECOSYSTEM_SINK_ADDRESS", "Bootstrap ecosystem sink"),
    poolAdmin: bootstrapAddress("BOOTSTRAP_POOL_ADMIN_ADDRESS", "Bootstrap pool admin"),
    faucetOwner: bootstrapAddress("BOOTSTRAP_FAUCET_OWNER_ADDRESS", "Bootstrap faucet owner"),
    ledgerAdmin: bootstrapAddress("BOOTSTRAP_LEDGER_ADMIN_ADDRESS", "Bootstrap ProofLedger admin"),
  };

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  VFIDE Full System Deployment             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  Network  : ${network} (chainId ${chainId})`);
  console.log(`  Testnet  : ${isTestnetChain ? "yes" : "no — MAINNET PATH"}`);
  console.log(`  Faucet   : ${deployTestnetFaucet && isTestnetChain ? "will deploy" : "skipped"}`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(
    `  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`,
  );

  // EIP-170 preflight — catches oversized contracts before any tx is sent.
  // VFIDETestnetFaucet is included only when actually deploying it.
  const preflightSet = (deployTestnetFaucet && isTestnetChain)
    ? [...DEPLOYMENT_CONTRACTS, "VFIDETestnetFaucet"]
    : DEPLOYMENT_CONTRACTS;
  await assertDeploymentBytecodeLimits(preflightSet);
  console.log("  Bytecode size preflight: all deployment contracts are within EIP-170 runtime limit.");

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

  // #415: Deploy AdminMultiSig before VFIDEToken so token treasury is contract-custodied at genesis.
  await deploy("AdminMultiSig", ...envArgs("AdminMultiSig"));

  await deploy("ProofLedger", bootstrap.ledgerAdmin);

  await deploy(
    "DevReserveVestingVault",
    ethers.ZeroAddress,            // _vfide  (wired after token)
    bootstrap.beneficiary,
    ethers.ZeroAddress,            // _vaultHub (wired after)
    ethers.ZeroAddress,            // _ledger   (wired after)
    ethers.parseEther("50000000"), // _allocation: 50 M VFIDE
    bootstrap.dao,
  );

  await deploy(
    "VFIDEToken",
    book.DevReserveVestingVault,
    book.AdminMultiSig, // treasury (receives 150 M)
    ethers.ZeroAddress, // _vaultHub (wired via timelock)
    book.ProofLedger,
    bootstrap.treasurySink,
  );


  // VFIDETokenViewer — read-only satellite; view functions extracted for EIP-170.
  // Non-custodial: no state writes. setViewer wires the reference in the token contract.
  await deploy("VFIDETokenViewer", book.VFIDEToken);
  if (book.VFIDEToken && book.VFIDETokenViewer) {
    const token = await ethers.getContractAt("VFIDEToken", book.VFIDEToken);
    await call("VFIDEToken.setViewer(VFIDETokenViewer)", () =>
      token.setViewer(book.VFIDETokenViewer),
    );
  }

// ══════════════════════════════════════════════════════════════════════════
  //  LAYER 2: Trust Engine
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 2: Trust Engine ═══");

  await deploy(
    "Seer",
    bootstrap.dao,
    book.ProofLedger,
    ethers.ZeroAddress,  // _hub (wired after VaultHub)
  );

  await deploy(
    "ProofScoreBurnRouter",
    book.Seer,
    bootstrap.sanctumSink,
    bootstrap.burnSink,
    bootstrap.ecosystemSink,
    book.VFIDEToken,  // _token
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 3: Vault System
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 3: Vault System ═══");

  // CBV deployer chain — must pre-exist before VaultHub (passed as _vaultDeployer arg).
  // Deploy order: AdminFacet → SubManagerDeployer → BytecodeProvider → Deployer → VaultHub
  await deploy("CardBoundVaultAdminFacet");
  // CBV-D1 FIX: CardBoundVaultSubManagerDeployer has no constructor; removed spurious book.VFIDEToken arg
  await deploy("CardBoundVaultSubManagerDeployer");
  // CBV-D2 FIX: CardBoundVaultBytecodeProvider has no constructor; removed spurious sub-manager arg
  await deploy("CardBoundVaultBytecodeProvider");
  await deploy(
    "CardBoundVaultDeployer",
    book.CardBoundVaultSubManagerDeployer,
    book.CardBoundVaultBytecodeProvider,
    book.CardBoundVaultAdminFacet,
  );

  await deploy(
    "VaultHub",
    book.VFIDEToken,
    book.ProofLedger,
    bootstrap.dao,
    book.CardBoundVaultDeployer,
  );

  // CBV-D3 FIX: CardBoundVaultDeployer.initHub() was never called — without it,
  // vaultHub == address(0) in the deployer, causing every CardBoundVaultDeployer.deploy()
  // call to revert with CBD_OnlyHub. No vault can ever be created until this is wired.
  if (book.CardBoundVaultDeployer && book.VaultHub) {
    const vaultDeployer = await ethers.getContractAt("CardBoundVaultDeployer", book.CardBoundVaultDeployer);
    const currentHub = await vaultDeployer.vaultHub();
    if (currentHub === ethers.ZeroAddress) {
      await call("CardBoundVaultDeployer.initHub → VaultHub", () =>
        vaultDeployer.initHub(book.VaultHub),
      );
    } else {
      console.log(`  ⏭  CardBoundVaultDeployer.initHub already set (${currentHub})`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 4: Commerce core
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 4: Commerce Core ═══");
  if (!book.VFIDEToken) {
    throw new Error("VFIDEToken address missing from deployment book before pool deployment");
  }

  await deploy(
    "DAOPayrollPool",
    ...poolArgs(ethers, "DAOPayrollPool", book.VFIDEToken, bootstrap.poolAdmin),
  );

  await deploy(
    "MerchantCompetitionPool",
    ...poolArgs(ethers, "MerchantCompetitionPool", book.VFIDEToken, bootstrap.poolAdmin),
  );

  await deploy(
    "HeadhunterCompetitionPool",
    ...poolArgs(ethers, "HeadhunterCompetitionPool", book.VFIDEToken, bootstrap.poolAdmin),
  );

  // FeeDistributor: 3-channel ecosystem router (no burn/sanctum — those are upstream in BurnRouter)
  await deploy(
    "FeeDistributor",
    book.VFIDEToken,
    book.DAOPayrollPool,
    book.MerchantCompetitionPool,
    book.HeadhunterCompetitionPool,
    bootstrap.admin,
  );

  await deploy(
    "MerchantPortal",
    bootstrap.dao,
    book.VaultHub,
    book.Seer,
    book.ProofLedger,
  );


  // MerchantPortalViewer — read-only satellite; pure view functions extracted for EIP-170.
  // Non-custodial: no state writes. setViewer is _checkDAO()-gated — call with DAO signer.
  await deploy("MerchantPortalViewer", book.MerchantPortal);
  if (book.MerchantPortal && book.MerchantPortalViewer) {
    const mp = await ethers.getContractAt("MerchantPortal", book.MerchantPortal,
      await ethers.getSigner(bootstrap.dao).catch(() => undefined));
    await call("MerchantPortal.setViewer(MerchantPortalViewer) [DAO signer]", () =>
      mp.setViewer(book.MerchantPortalViewer),
    );
  }

// ══════════════════════════════════════════════════════════════════════════
  //  LAYER 5: Governance
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 5: Governance ═══");

  await deploy("DAOTimelock", bootstrap.admin);

  await deploy(
    "GovernanceHooks",
    book.ProofLedger,
    book.Seer,
    bootstrap.dao,
  );

  await deploy(
    "DAO",
    bootstrap.admin,
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
    bootstrap.dao,
    book.Seer,
    book.FeeDistributor,
  );

  await deploy(
    "VFIDETermLoan",
    book.VFIDEToken,
    bootstrap.dao,
    book.Seer,
    book.VaultHub,
    book.FeeDistributor,
  );

  // A.2 FIX (MAINNET_DEPLOY_READINESS.md): deploy VFIDEPriceOracle directly here
  // instead of via DeployPhase3Peripherals.deployPeripherals(). The helper also
  // deploys BridgeSecurityModule (a deferred future contract under
  // contracts/future/), which V1 mainnet must not pull in.
  //
  // Constructor: (_vfideToken, _quoteToken, _chainlinkFeed, _uniswapPool, _owner).
  // The first arg comes from the deploy book; the remaining 4 are env-supplied
  // via ARGS_VFIDEPRICEORACLE='[quote, chainlinkFeed, uniswapPool, owner]'.
  // chainlinkFeed and uniswapPool may be address(0) on chains where they're
  // unavailable at deploy time; the oracle accepts that and uses whichever
  // source is configured.
  {
    const priceOracleEnvArgs = envArgs("VFIDEPriceOracle");
    if (priceOracleEnvArgs.length !== 4) {
      throw new Error(
        "VFIDEPriceOracle requires ARGS_VFIDEPRICEORACLE='[quoteToken, chainlinkFeed, uniswapPool, owner]' (4 addresses). " +
        "Set chainlinkFeed/uniswapPool to address(0) if not yet available — the oracle handles that.",
      );
    }
    await deploy("VFIDEPriceOracle", book.VFIDEToken, ...priceOracleEnvArgs);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 7: Safety
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 7: Safety ═══");

  await deploy(
    "FraudRegistry",
    bootstrap.dao,
    book.Seer,
    book.VFIDEToken,
  );

  // VFIDETestnetFaucet — TESTNET ONLY, behind explicit opt-in.
  // The faucet's own constructor enforces the same chainId allowlist
  // (TESTNET_CHAIN_IDS), but we gate at the script level too so a
  // misconfigured mainnet run fails fast with a clear message instead
  // of burning gas on a constructor revert.
  if (isTestnetChain && deployTestnetFaucet) {
    await deploy(
      "VFIDETestnetFaucet",
      book.VFIDEToken,
      bootstrap.faucetOwner,
    );
  } else {
    if (!book.VFIDETestnetFaucet) book.VFIDETestnetFaucet = ethers.ZeroAddress;
    console.log(
      `  ⏭  Skipping VFIDETestnetFaucet (chainId ${chainId}, ` +
      `DEPLOY_TESTNET_FAUCET=${process.env.DEPLOY_TESTNET_FAUCET ?? "unset"})`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 8: Governance / Admin helpers  (formerly phase 2)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 8: Governance Helpers ═══");

  // VFIDEAccessControl-D1: Deploy standalone RBAC primitive with deployer as initial admin.
  // Per manual page 69, VFIDEAccessControl belongs in the governance group.
  // It currently has no production consumers in Phase 1 but must be on-chain as an
  // upgradeable governance surface for post-handover DAO use.
  await deploy("VFIDEAccessControl", deployer.address);

  for (const name of [
    "OwnerControlPanel",
    "VaultRecoveryClaim",
    "SystemHandover",
    "EmergencyControl",
  ] as const) {
    await deploy(name, ...envArgs(name));
  }

  if (book.VaultRecoveryClaim && book.VaultHub) {
    const hub = await ethers.getContractAt("VaultHub", book.VaultHub);
    await call("VaultHub.setRecoveryApprover(VaultRecoveryClaim)", () =>
      hub.setRecoveryApprover(book.VaultRecoveryClaim, true),
    );
    // Capture the immutable CardBoundVaultDeployer address from VaultHub
    try {
      const deployerAddr: string = await hub.cardBoundVaultDeployer();
      book.CardBoundVaultDeployer = deployerAddr;
      console.log(`  → CardBoundVaultDeployer: ${deployerAddr}`);
    } catch {
      console.warn("  ⚠ cardBoundVaultDeployer() not available on this VaultHub");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 9: Ecosystem vaults + badges  (formerly phase 3)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 9: Ecosystem / Badges ═══");

  // SV-D4 FIX: ARGS_SANCTUMVAULT was not documented and envArgs() returned [] when not set,
  // causing deploy() to fail with "missing constructor arguments". Auto-inject from book.
  {
    const svArgs = envArgs("SanctumVault");
    const sanctumArgs = svArgs.length === 3
      ? svArgs
      : [bootstrap.dao, book.ProofLedger, book.Seer];
    await deploy("SanctumVault", ...sanctumArgs);
  }

  // EcosystemVaultAdminFacet must be pre-deployed so its address can be
  // passed as the 4th immutable constructor argument of EcosystemVault.
  const ecoAdminFacet = await deploy("EcosystemVaultAdminFacet");
  log(`  EcosystemVaultAdminFacet → ${await ecoAdminFacet.getAddress()}`);

  // EcosystemVault constructor: (vfide, seer, operationsWallet, adminFacet)
  const ecoVaultArgs = envArgs("EcosystemVault");
  if (ecoVaultArgs.length === 3) {
    // Inject adminFacet as 4th arg when caller only provided the first 3
    ecoVaultArgs.push(await ecoAdminFacet.getAddress());
  }
  const ecoVault = await deploy("EcosystemVault", ...ecoVaultArgs);
  log(`  EcosystemVault          → ${await ecoVault.getAddress()}`);

  for (const name of [
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

  // CE-D5 FIX: MerchantRegistry + CommerceEscrow were deployed with bare envArgs() and
  // no documented ARGS_ env vars, causing silent 0-arg deploy failures against 5-arg and 4-arg
  // constructors respectively. Auto-inject from book when env vars not set.
  {
    const mrArgs = envArgs("MerchantRegistry");
    await deploy(
      "MerchantRegistry",
      ...(mrArgs.length === 5 ? mrArgs : [bootstrap.dao, book.VFIDEToken, book.VaultHub, book.Seer, book.ProofLedger]),
    );
  }
  {
    const ceArgs = envArgs("CommerceEscrow");
    await deploy(
      "CommerceEscrow",
      ...(ceArgs.length === 4 ? ceArgs : [bootstrap.dao, book.VFIDEToken, book.VaultHub, book.MerchantRegistry]),
    );
  }

  if (book.MerchantRegistry) book.VFIDECommerce = book.MerchantRegistry;

  // SubscriptionManager — self-contained; requires only VaultHub, DAO, Seer.
  // Previously deferred to contracts/future/ under the phased-rollout strategy.
  // Moved to Layer 11 Phase 1 (2026-05-27): no external provider dependencies.
  await deploy(
    "SubscriptionManager",
    book.VaultHub,
    bootstrap.dao,
    book.Seer,
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  LAYER 12: Ecosystem Satellites (promoted from contracts/future/ 2026-05-27)
  //  All have only internal constructor deps (DAO, Seer, VaultHub, Ledger).
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n═══ LAYER 12: Ecosystem Satellites ═══");

  // Badge system
  await deploy("BadgeManager",          book.DAO, book.Seer, book.BadgeQualificationRules ?? ethers.ZeroAddress);
  await deploy("VFIDEBadgeNFT",         book.Seer, "");

  // Council governance
  await deploy("CouncilElection",       book.DAO, book.Seer, book.VaultHub, book.ProofLedger);
  await deploy("CouncilSalary",         book.CouncilElection, book.Seer, book.VFIDEToken, book.DAO);

  // Seer satellites
  // EIP-170: deploy admin facet first, pass to SeerAutonomous constructor
  await deploy("SeerAutonomousAdminFacet");
  await deploy("SeerAutonomous",        book.DAO, book.Seer, book.ProofLedger, book.SeerAutonomousAdminFacet);
  await deploy("SeerGuardian",          book.DAO, book.Seer, book.VaultHub, book.ProofLedger);
  await deploy("SeerPolicyGuard",       book.DAO, book.Seer);
  await deploy("SeerSocial",            book.Seer);
  await deploy("SeerWorkAttestation",   bootstrap.deployer);

  // Utilities
  await deploy("VFIDEBenefits",         book.DAO, book.Seer, book.ProofLedger);

  // VFIDEEnterpriseGateway — oracle = VFIDEPriceOracle (Phase 1); swapRouter optional (DAO-activated post-deploy)
  await deploy("VFIDEEnterpriseGateway",
    book.DAO,
    book.VFIDEToken,
    book.Seer,
    book.VaultHub,
    book.VFIDEPriceOracle,
    bootstrap.deployer,   // merchantWallet — transfer to ops multisig post-deploy
  );

  // MainstreamPayments — deploys as empty registry; providers register post-launch
  await deploy("MainstreamPayments",    book.DAO, book.Seer, book.ProofLedger);

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
    ["SubscriptionManager",  book.SubscriptionManager],
    // Layer 12 satellites
    ["BadgeManager",         book.BadgeManager],
    ["CouncilElection",      book.CouncilElection],
    ["CouncilSalary",        book.CouncilSalary],
    ["SeerAutonomousAdminFacet", book.SeerAutonomousAdminFacet],
    ["SeerAutonomous",       book.SeerAutonomous],
    ["SeerGuardian",         book.SeerGuardian],
    ["SeerPolicyGuard",      book.SeerPolicyGuard],
    ["SeerSocial",           book.SeerSocial],
    ["SeerWorkAttestation",  book.SeerWorkAttestation],
    ["VFIDEBenefits",        book.VFIDEBenefits],
    ["VFIDEEnterpriseGateway", book.VFIDEEnterpriseGateway],
    ["MainstreamPayments",   book.MainstreamPayments],
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

  // SubscriptionManager → DAO  (SM-GOV1 FIX: was never rotated; immediate setDAO, no timelock)
  if (book.SubscriptionManager && book.DAO) {
    const subMgr = await ethers.getContractAt("SubscriptionManager", book.SubscriptionManager);
    await call("SubscriptionManager.setDAO → DAO", () => subMgr.setDAO(book.DAO));
  }

  // VFIDEFlashLoan → DAO
  const flash = await ethers.getContractAt("VFIDEFlashLoan", book.VFIDEFlashLoan);
  await call("VFIDEFlashLoan.setDAO → DAO", () => flash.setDAO(book.DAO));

  // VFIDETermLoan → DAO
  const term = await ethers.getContractAt("VFIDETermLoan", book.VFIDETermLoan);
  await call("VFIDETermLoan.setDAO → DAO", () => term.setDAO(book.DAO));

  // CE-GOV1 NOTE: CommerceEscrow.sol has no setDAO() function. The dao address set at
  // construction (bootstrap.dao EOA) is permanent. Governance proposals cannot rotate it.
  // Mitigation: CommerceEscrow's privileged functions are limited to parameter updates
  // (expiry, fee) that are bounded by constants. The main escrow flow is user-initiated.
  // Track as a known limitation until CommerceEscrow v2 adds a timelocked setDAO.

  // MerchantRegistry ↔ CommerceEscrow
  if (book.MerchantRegistry && book.CommerceEscrow) {
    const registry = await ethers.getContractAt("MerchantRegistry", book.MerchantRegistry);
    await call("MerchantRegistry.setAuthorizedEscrow → CommerceEscrow", () =>
      registry.setAuthorizedEscrow(book.CommerceEscrow),
    );
  }

  // CommerceEscrow ↔ Seer (Issue #269: score-tiered lock periods require Seer integration)
  // setSeer() is onlyDAO. Wired immediately post-deploy — no timelock on this setter.
  if (book.CommerceEscrow && book.Seer) {
    const ce = await ethers.getContractAt("CommerceEscrow", book.CommerceEscrow);
    await call("CommerceEscrow.setSeer → Seer", () =>
      ce.setSeer(book.Seer),
    );
  }

  // SubscriptionManager → FraudRegistry (queued — 24h timelock via applyFraudRegistry)
  if (book.SubscriptionManager && book.FraudRegistry) {
    const subMgr = await ethers.getContractAt("SubscriptionManager", book.SubscriptionManager);
    await call("SubscriptionManager.setFraudRegistry → FraudRegistry (queued 24h)", () =>
      subMgr.setFraudRegistry(book.FraudRegistry),
    );
  }

  // ── Layer 12: Seer satellite wiring ──────────────────────────────────────
  // Wire Seer satellites into Seer contract (all onlyDAO, immediate — no timelock on these setters)

  // SEER-D1 fix: setModules was never called — Seer.vaultHub was permanently address(0).
  // Without this, any vault-balance-weighted score calculation silently falls back to NEUTRAL.
  if (book.ProofLedger && book.VaultHub) {
    await call("Seer.setModules → ProofLedger + VaultHub", () =>
      seer.setModules(book.ProofLedger, book.VaultHub),
    );
  }

  // SEER-D2 fix: setBurnRouter was never called — Seer score-change events never notified
  // ProofScoreBurnRouter, meaning the burn router's internal score cache stayed stale.
  if (book.ProofScoreBurnRouter) {
    await call("Seer.setBurnRouter → ProofScoreBurnRouter", () =>
      seer.setBurnRouter(book.ProofScoreBurnRouter),
    );
  }

  if (book.SeerSocial)     await call("Seer.setSeerSocial → SeerSocial",         () => seer.setSeerSocial(book.SeerSocial));
  if (book.SeerAutonomous) await call("Seer.setSeerAutonomous → SeerAutonomous", () => seer.setSeerAutonomous(book.SeerAutonomous));
  if (book.SeerPolicyGuard) await call("Seer.setPolicyGuard → SeerPolicyGuard",  () => seer.setPolicyGuard(book.SeerPolicyGuard));

  // SeerGuardian — wire internal modules (no external dep)
  if (book.SeerGuardian && book.ProofLedger && book.VaultHub) {
    const guardian = await ethers.getContractAt("SeerGuardian", book.SeerGuardian);
    await call("SeerGuardian.setModules → Seer/VaultHub/Ledger", () =>
      guardian.setModules(book.Seer, book.VaultHub, book.ProofLedger),
    );
  }

  // CouncilSalary — set DAO (separate from constructor; timelocked)
  if (book.CouncilSalary) {
    const salary = await ethers.getContractAt("CouncilSalary", book.CouncilSalary);
    await call("CouncilSalary.setDAO → DAO (queued)", () => salary.setDAO(book.DAO));
  }

  // ── Faucet ↔ EcosystemVault wiring ───────────────────────────────────────
  // The faucet records referrals on EcosystemVault.registerUserReferral,
  // which is `onlyManager`. Without these two calls, every faucet claim's
  // referral is silently dropped (the call is wrapped in try/catch on the
  // faucet side), and the headhunter competition pool starves on testnet.
  //
  // EcosystemVault.setManager is timelocked (SENSITIVE_CHANGE_DELAY = 2 days)
  // when the owner is an EOA, so this `setManager` call only QUEUES the
  // change.  apply-full.ts calls `executeManagerChange()` after the delay.
  //
  // This wiring is testnet-only, mirroring the faucet deploy gate above.
  if (
    isTestnetChain &&
    deployTestnetFaucet &&
    book.VFIDETestnetFaucet &&
    book.VFIDETestnetFaucet !== ethers.ZeroAddress &&
    book.EcosystemVault
  ) {
    const ecosystemVault = await ethers.getContractAt("EcosystemVault", book.EcosystemVault);
    const faucet = await ethers.getContractAt("VFIDETestnetFaucet", book.VFIDETestnetFaucet);

    await call("EcosystemVault.setManager(Faucet) → queued (2d timelock)", () =>
      ecosystemVault.setManager(book.VFIDETestnetFaucet, true),
    );
    // Faucet.setEcosystemVault has no timelock — owner-only immediate.
    await call("Faucet.setEcosystemVault → EcosystemVault", () =>
      faucet.setEcosystemVault(book.EcosystemVault),
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
  // VFIDEToken-T1: Wire SeerAutonomous into token so VF_SeerBlocked fires on every transfer.
  // Without this, _enforceSeerAction returns early and Seer hard-blocks are silently skipped.
  if (book.SeerAutonomous) {
    await call("Token.setSeerAutonomous (proposal, 48h)", () =>
      token.setSeerAutonomous(book.SeerAutonomous),
    );
  }
  // VFIDEToken-T2: Wire EcosystemDistributor so eco fees route to FeeDistributor.receiveFee()
  // rather than falling back silently to treasurySink.
  if (book.FeeDistributor) {
    await call("Token.setEcosystemDistributor (proposal, 48h)", () =>
      token.setEcosystemDistributor(book.FeeDistributor),
    );
  }

  // ── BurnRouter sustainability seed (24h timelock) ─────────────────────────
  // dailyBurnCap = 500,000 VFIDE  |  minimumSupplyFloor = 50,000,000 VFIDE
  // ecosystemMinBps = 5 (0.05%)
  // applySustainability() is called in apply-full.ts after the 24h window.
  {
    const burnRouter = await ethers.getContractAt("ProofScoreBurnRouter", book.ProofScoreBurnRouter);
    const DAILY_CAP   = ethers.parseUnits("500000",    18); // 500k VFIDE
    const SUPPLY_FLOOR= ethers.parseUnits("50000000",  18); // 50M  VFIDE
    const ECO_MIN_BPS = 5;                                  // 0.05%
    await call(
      "BurnRouter.setSustainability (proposal, 24h timelock)",
      () => burnRouter.setSustainability(DAILY_CAP, SUPPLY_FLOOR, ECO_MIN_BPS)
    );
  }

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
    ["NEXT_PUBLIC_VFIDE_ACCESS_CONTROL_ADDRESS",book.VFIDEAccessControl],
    ["NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS",book.OwnerControlPanel],
    ["NEXT_PUBLIC_ADMIN_MULTISIG_ADDRESS",     book.AdminMultiSig],
    ["NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS",      book.SanctumVault],
    ["NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS",    book.EcosystemVault],
    ["NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS", book.CardBoundVaultDeployer],
    ["NEXT_PUBLIC_CBV_ADMIN_FACET_ADDRESS",             book.CardBoundVaultAdminFacet],
    ["NEXT_PUBLIC_MERCHANT_PORTAL_VIEWER_ADDRESS",      book.MerchantPortalViewer],
    ["NEXT_PUBLIC_VFIDE_TOKEN_VIEWER_ADDRESS",          book.VFIDETokenViewer],
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

// OP-1 FIX: propagate non-zero exit on failure so CI/CD pipelines
// (and the deploy.sh wrapper) actually detect deploy errors. The
// previous `main().catch(console.error)` swallowed errors and returned
// exit code 0, making a partially-deployed system look like a successful
// deploy.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
