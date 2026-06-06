/**
 * VFIDE Sanctum Vault Seeder
 *
 * Deposits an initial VFIDE reserve into SanctumVault so it can serve
 * community reward and recovery operations from day one.
 *
 * The SanctumVault.deposit() function requires:
 *   1. Caller approves SanctumVault to spend VFIDE
 *   2. Caller calls deposit(vfideTokenAddress, amount, note)
 *
 * Usage:
 *   npx hardhat run scripts/seed-sanctum.ts --network baseSepolia
 *
 * Optional env vars (defaults shown):
 *   SANCTUM_SEED_VFIDE    Whole VFIDE tokens to deposit (default: 1000000)
 *   SANCTUM_SEED_NOTE     Note string stored on-chain (default: "Protocol genesis seed")
 *
 * Hard-fails if:
 *   - SanctumVault or VFIDEToken address missing from deployment book
 *   - Deployer VFIDE balance is below the requested seed amount
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

type Book = Record<string, string>;

function readBook(network: string): Book {
  const fp = path.join(process.cwd(), ".deployments", `${network}.json`);
  if (!fs.existsSync(fp)) {
    throw new Error(
      `Deployment book not found for network "${network}". Run deploy-full.ts first.`,
    );
  }
  return JSON.parse(fs.readFileSync(fp, "utf8")) as Book;
}

function requireAddress(book: Book, key: string): string {
  const addr = book[key];
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`Missing or invalid address for "${key}" in deployment book.`);
  }
  return addr;
}

async function main(): Promise<void> {
  const ethers = await resolveEthers();
  const network = hre.network.name;

  console.log(`\n🏦  VFIDE Sanctum Vault Seeder — ${network}\n`);

  // ── Config ───────────────────────────────────────────────────────────────
  const seedWhole = BigInt(
    process.env.SANCTUM_SEED_VFIDE?.trim() || "1000000",
  );
  const note = process.env.SANCTUM_SEED_NOTE?.trim() || "Protocol genesis seed";
  const seedAmount = seedWhole * 10n ** 18n;

  // ── Addresses ────────────────────────────────────────────────────────────
  const book = readBook(network);
  const sanctumAddr  = requireAddress(book, "SanctumVault");
  const vfideAddr    = requireAddress(book, "VFIDEToken");

  console.log(`  SanctumVault : ${sanctumAddr}`);
  console.log(`  VFIDEToken   : ${vfideAddr}`);
  console.log(`  Seed amount  : ${seedWhole.toLocaleString()} VFIDE`);
  console.log(`  Note         : "${note}"\n`);

  // ── Deployer ─────────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  console.log(`  Deployer     : ${deployer.address}`);

  // ── Minimal ABIs ─────────────────────────────────────────────────────────
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  const sanctumAbi = [
    "function deposit(address token, uint256 amount, string calldata note) external",
  ];

  const vfide   = new ethers.Contract(vfideAddr,   erc20Abi,   deployer);
  const sanctum = new ethers.Contract(sanctumAddr, sanctumAbi, deployer);

  // ── Balance check ─────────────────────────────────────────────────────────
  const balance: bigint = await vfide.balanceOf(deployer.address);
  console.log(
    `  Deployer VFIDE balance: ${(balance / 10n ** 18n).toLocaleString()} VFIDE`,
  );

  if (balance < seedAmount) {
    throw new Error(
      `Deployer has insufficient VFIDE: has ${balance / 10n ** 18n} VFIDE, ` +
      `needs ${seedWhole} VFIDE. Fund the deployer first.`,
    );
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  const allowance: bigint = await vfide.allowance(deployer.address, sanctumAddr);
  if (allowance < seedAmount) {
    console.log(`\n  ⏳  Approving SanctumVault to spend ${seedWhole.toLocaleString()} VFIDE...`);
    const approveTx = await vfide.approve(sanctumAddr, seedAmount);
    await approveTx.wait();
    console.log(`  ✓  Approved (tx: ${approveTx.hash})`);
  } else {
    console.log(`  ✓  Allowance already sufficient — skipping approve`);
  }

  // ── Deposit ───────────────────────────────────────────────────────────────
  console.log(`\n  ⏳  Depositing into SanctumVault...`);
  const depositTx = await sanctum.deposit(vfideAddr, seedAmount, note);
  const receipt = await depositTx.wait();
  console.log(`  ✓  Deposit confirmed (tx: ${depositTx.hash})`);
  console.log(`     Block: ${receipt.blockNumber}`);

  console.log(
    `\n✅  SanctumVault seeded: ${seedWhole.toLocaleString()} VFIDE deposited`,
  );
  console.log(`   (tx: ${depositTx.hash})\n`);
}

main().catch((err) => {
  console.error("\n❌ seed-sanctum failed:", err.message ?? err);
  process.exit(1);
});
