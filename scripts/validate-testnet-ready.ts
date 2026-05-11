/**
 * validate-testnet-ready.ts
 *
 * One-shot pre-flight check for the VFIDE testnet deployment. Reads
 * `.deployments/<network>.json` plus current env and verifies that:
 *
 *   1. We are on a supported testnet chain id.
 *   2. Every contract in the canonical set has a deployed address.
 *   3. The deployed VFIDEToken has the correct supply (200M VFIDE).
 *   4. The deployed VFIDEToken's modules are wired (vaultHub, burnRouter,
 *      fraudRegistry — i.e. apply-full.ts ran to completion).
 *   5. The faucet is funded (VFIDE balance + ETH balance) and configured
 *      against EcosystemVault.
 *   6. The EcosystemVault recognises the faucet as a manager.
 *   7. All NEXT_PUBLIC_*_ADDRESS env vars are filled and match the book.
 *
 * Exits non-zero on any failure so this can be wired into CI/CD.
 *
 *   npx hardhat run scripts/validate-testnet-ready.ts --network baseSepolia
 */

import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

async function resolveEthers(): Promise<any> {
  const runtime = hre as any;
  if (runtime.ethers) return runtime.ethers;
  if (runtime.network?.connect) {
    const c = await runtime.network.connect();
    if (c?.ethers) return c.ethers;
  }
  throw new Error("Hardhat ethers runtime is unavailable.");
}

const TESTNET_CHAIN_IDS = new Set<number>([
  31337, 84532, 80002, 300, 11155111, 421614, 11155420,
]);

// Contracts the frontend depends on, with their book key and env var name.
const REQUIRED_CONTRACTS: Array<{ bookKey: string; envKey: string }> = [
  { bookKey: "VFIDEToken",                envKey: "NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS" },
  { bookKey: "VaultHub",                  envKey: "NEXT_PUBLIC_VAULT_HUB_ADDRESS" },
  { bookKey: "Seer",                      envKey: "NEXT_PUBLIC_SEER_ADDRESS" },
  { bookKey: "MerchantPortal",            envKey: "NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS" },
  { bookKey: "ProofScoreBurnRouter",      envKey: "NEXT_PUBLIC_BURN_ROUTER_ADDRESS" },
  { bookKey: "DAO",                       envKey: "NEXT_PUBLIC_DAO_ADDRESS" },
  { bookKey: "DAOTimelock",               envKey: "NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS" },
  { bookKey: "FeeDistributor",            envKey: "NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS" },
  { bookKey: "ProofLedger",               envKey: "NEXT_PUBLIC_PROOF_LEDGER_ADDRESS" },
  { bookKey: "FraudRegistry",             envKey: "NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS" },
  { bookKey: "VFIDEFlashLoan",            envKey: "NEXT_PUBLIC_FLASH_LOAN_ADDRESS" },
  { bookKey: "VFIDETermLoan",             envKey: "NEXT_PUBLIC_TERM_LOAN_ADDRESS" },
  { bookKey: "GovernanceHooks",           envKey: "NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS" },
  { bookKey: "EcosystemVault",            envKey: "NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS" },
  { bookKey: "DAOPayrollPool",            envKey: "NEXT_PUBLIC_DAO_PAYROLL_POOL_ADDRESS" },
  { bookKey: "MerchantCompetitionPool",   envKey: "NEXT_PUBLIC_MERCHANT_POOL_ADDRESS" },
  { bookKey: "HeadhunterCompetitionPool", envKey: "NEXT_PUBLIC_HEADHUNTER_POOL_ADDRESS" },
];

const FAUCET_CONTRACT = { bookKey: "VFIDETestnetFaucet", envKey: "NEXT_PUBLIC_FAUCET_ADDRESS" };

const EXPECTED_TOTAL_SUPPLY = 200_000_000n * 10n ** 18n;
// Minimum healthy faucet balance: enough for 10 claims at default 1000 VFIDE
const MIN_FAUCET_VFIDE       = 10_000n * 10n ** 18n;
// Minimum healthy faucet ETH: enough for 10 claims at default 0.005 ETH
const MIN_FAUCET_ETH         = 5n * 10n ** 16n; // 0.05 ETH

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  const icon = ok ? "✅" : "❌";
  console.log(`  ${icon} ${name}: ${detail}`);
}

async function main() {
  const ethers = await resolveEthers();
  const signers = await ethers.getSigners();
  const signer = signers[0] ?? null;
  const networkArgIndex = process.argv.indexOf("--network");
  const cliNetwork = networkArgIndex >= 0 ? process.argv[networkArgIndex + 1] : undefined;
  const network = cliNetwork || (hre as any).network?.name || process.env.HARDHAT_NETWORK || "hardhat";
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  VFIDE Testnet Readiness Check             ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  Network  : ${network} (chainId ${chainId})`);
  console.log(`  Signer   : ${signer?.address ?? "(none)"}\n`);

  // ── 1. Chain id ──────────────────────────────────────────────────────────
  console.log("═══ 1. Chain ═══");
  record(
    "supported testnet chain id",
    TESTNET_CHAIN_IDS.has(chainId),
    `chainId=${chainId}`,
  );

  // ── 2. Deployment book ────────────────────────────────────────────────────
  console.log("\n═══ 2. Deployment Book ═══");
  const bookPath = path.join(process.cwd(), ".deployments", `${network}.json`);
  if (!fs.existsSync(bookPath)) {
    record("deployment book present", false, `missing ${bookPath}`);
    finish();
    return;
  }
  record("deployment book present", true, bookPath);
  const book: Record<string, string> = JSON.parse(fs.readFileSync(bookPath, "utf8"));

  for (const c of [...REQUIRED_CONTRACTS, FAUCET_CONTRACT]) {
    const addr = book[c.bookKey];
    const ok = !!addr && /^0x[a-fA-F0-9]{40}$/.test(addr) && addr !== ethers.ZeroAddress;
    record(`book.${c.bookKey}`, ok, addr ?? "(missing)");
  }

  // ── 3. Token supply ──────────────────────────────────────────────────────
  console.log("\n═══ 3. VFIDEToken Supply ═══");
  if (book.VFIDEToken) {
    try {
      const token = await ethers.getContractAt("VFIDEToken", book.VFIDEToken);
      const supply: bigint = await token.totalSupply();
      record(
        "total supply == 200M VFIDE",
        supply === EXPECTED_TOTAL_SUPPLY,
        `actual=${ethers.formatEther(supply)} VFIDE`,
      );
    } catch (e: any) {
      record("total supply read", false, e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── 4. Token module wiring (post-apply-full state) ───────────────────────
  console.log("\n═══ 4. VFIDEToken Module Wiring ═══");
  if (book.VFIDEToken) {
    const token = await ethers.getContractAt("VFIDEToken", book.VFIDEToken);

    async function wired(label: string, getter: string, expected?: string) {
      try {
        const got = String(await (token as any)[getter]());
        const ok = got !== ethers.ZeroAddress && (!expected || got.toLowerCase() === expected.toLowerCase());
        record(`${label} (${getter})`, ok, expected ? `${got} === ${expected}` : got);
      } catch (e: any) {
        record(`${label} (${getter})`, false, e.message?.slice(0, 80) ?? String(e));
      }
    }

    await wired("vaultHub",      "vaultHub",      book.VaultHub);
    await wired("burnRouter",    "burnRouter",    book.ProofScoreBurnRouter);
    await wired("fraudRegistry", "fraudRegistry", book.FraudRegistry);
    await wired("ledger",        "ledger",        book.ProofLedger);
  }

  // ── 5. Faucet config + balance ───────────────────────────────────────────
  console.log("\n═══ 5. Faucet Config & Balance ═══");
  if (book.VFIDETestnetFaucet && book.VFIDETestnetFaucet !== ethers.ZeroAddress) {
    try {
      const faucet = await ethers.getContractAt("VFIDETestnetFaucet", book.VFIDETestnetFaucet);
      const status = await faucet.getFaucetStatus();
      const vfideBal: bigint = status[0];
      const ethBal:   bigint = status[1];

      record(
        "faucet VFIDE balance",
        vfideBal >= MIN_FAUCET_VFIDE,
        `${ethers.formatEther(vfideBal)} VFIDE (min ${ethers.formatEther(MIN_FAUCET_VFIDE)})`,
      );
      record(
        "faucet ETH balance",
        ethBal >= MIN_FAUCET_ETH,
        `${ethers.formatEther(ethBal)} ETH (min ${ethers.formatEther(MIN_FAUCET_ETH)})`,
      );

      const ecoOnFaucet = String(await faucet.ecosystemVault());
      record(
        "faucet.ecosystemVault wired",
        !!book.EcosystemVault && ecoOnFaucet.toLowerCase() === book.EcosystemVault.toLowerCase(),
        ecoOnFaucet,
      );
    } catch (e: any) {
      record("faucet read", false, e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── 6. EcosystemVault manager wiring ─────────────────────────────────────
  console.log("\n═══ 6. EcosystemVault ↔ Faucet Manager Wiring ═══");
  if (book.EcosystemVault && book.VFIDETestnetFaucet && book.VFIDETestnetFaucet !== ethers.ZeroAddress) {
    try {
      const eco = await ethers.getContractAt("EcosystemVault", book.EcosystemVault);
      const isManager: boolean = await eco.isManager(book.VFIDETestnetFaucet);
      record(
        "EcosystemVault.isManager(faucet)",
        isManager,
        isManager ? "true" : "FALSE — run apply-full.ts to execute queued change",
      );
    } catch (e: any) {
      record("EcosystemVault manager check", false, e.message?.slice(0, 80) ?? String(e));
    }
  }

  // ── 6b. Module DAO ownership ──────────────────────────────────────────────
  // Every governance-bearing module should report `dao() == book.DAO` after
  // apply-full.ts has run. If any still report the deployer, the 48h
  // timelocked applyDAO/applyDAO_FR step hasn't been executed.
  console.log("\n═══ 6b. Module DAO Transfer Completion ═══");
  if (book.DAO) {
    const moduleDaoChecks: Array<{ name: string; getter: string }> = [
      { name: "GovernanceHooks", getter: "dao" },
      { name: "MerchantPortal",  getter: "dao" },
      { name: "VFIDEFlashLoan",  getter: "dao" },
      { name: "VFIDETermLoan",   getter: "dao" },
      { name: "FraudRegistry",   getter: "dao" },
      { name: "Seer",            getter: "dao" },
    ];
    for (const m of moduleDaoChecks) {
      const addr = book[m.name];
      if (!addr) continue;
      try {
        const c = await ethers.getContractAt(m.name, addr);
        const got = String(await (c as any)[m.getter]());
        const ok = got.toLowerCase() === book.DAO.toLowerCase();
        record(
          `${m.name}.dao === book.DAO`,
          ok,
          ok ? got : `${got} (expected ${book.DAO})`,
        );
      } catch (e: any) {
        record(`${m.name}.dao read`, false, e.message?.slice(0, 80) ?? String(e));
      }
    }
  }

  // ── 7. Environment variable parity ───────────────────────────────────────
  console.log("\n═══ 7. Frontend ENV vs Deployment Book ═══");
  for (const c of [...REQUIRED_CONTRACTS, FAUCET_CONTRACT]) {
    const fromBook = book[c.bookKey];
    const fromEnv = process.env[c.envKey];
    if (!fromBook) continue;
    if (!fromEnv) {
      record(`env.${c.envKey}`, false, "missing");
      continue;
    }
    record(
      `env.${c.envKey}`,
      fromEnv.toLowerCase() === fromBook.toLowerCase(),
      `${fromEnv.slice(0, 10)}…`,
    );
  }

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  if (failed.length === 0) {
    console.log("║  ✅  Testnet is READY for announcement                     ║");
  } else {
    console.log(`║  ❌  ${failed.length} check(s) failed — NOT ready to announce        ║`);
  }
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  if (failed.length > 0) {
    console.error("Failed checks:");
    for (const f of failed) console.error(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
