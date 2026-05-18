/**
 * VFIDE Testnet Faucet Funder
 *
 * Funds VFIDETestnetFaucet with VFIDE tokens and gas ETH so it can serve
 * /api/faucet/claim requests. Reads addresses from .deployments/<network>.json
 * (written by deploy-full.ts) — no hand-typed addresses required.
 *
 * Usage:
 *   npx hardhat run scripts/fund-faucet.ts --network baseSepolia
 *
 * Optional env vars (defaults shown):
 *   FAUCET_FUND_VFIDE_AMOUNT     Whole VFIDE tokens to send (default: 100000)
 *   FAUCET_FUND_ETH_AMOUNT       ETH to send (default: 0.5)
 *   FAUCET_OPERATOR_ADDRESS      Add this address as a faucet operator (optional)
 *
 * Hard-fails (does NOT silently fund) if:
 *   - Run on a non-testnet chain
 *   - Faucet address missing from deployment book
 *   - Deployer balance is insufficient for the requested amount
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

type Book = Record<string, string>;

function readBook(network: string): Book {
  const fp = path.join(process.cwd(), ".deployments", `${network}.json`);
  if (!fs.existsSync(fp)) {
    throw new Error(
      `Deployment book not found at ${fp}. Run deploy-full.ts first.`,
    );
  }
  return JSON.parse(fs.readFileSync(fp, "utf8")) as Book;
}

async function main() {
  const ethers = await resolveEthers();
  const [deployer] = await ethers.getSigners();
  const network = process.env.HARDHAT_NETWORK ?? "hardhat";
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  if (!TESTNET_CHAIN_IDS.has(chainId)) {
    throw new Error(
      `fund-faucet.ts is testnet-only. Refusing to run on chainId ${chainId}.`,
    );
  }

  const book = readBook(network);
  const faucetAddr = book.VFIDETestnetFaucet;
  const tokenAddr = book.VFIDEToken;

  if (!faucetAddr || faucetAddr === ethers.ZeroAddress) {
    throw new Error(
      "VFIDETestnetFaucet address missing from deployment book. " +
      "Run deploy-full.ts with DEPLOY_TESTNET_FAUCET=true first.",
    );
  }
  if (!tokenAddr) {
    throw new Error("VFIDEToken address missing from deployment book.");
  }

  const vfideAmt = ethers.parseEther(process.env.FAUCET_FUND_VFIDE_AMOUNT ?? "100000");
  const ethAmt = ethers.parseEther(process.env.FAUCET_FUND_ETH_AMOUNT ?? "0.5");

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  VFIDE Faucet Funder                       ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  Network  : ${network} (chainId ${chainId})`);
  console.log(`  Funder   : ${deployer.address}`);
  console.log(`  Faucet   : ${faucetAddr}`);
  console.log(`  Token    : ${tokenAddr}`);
  console.log(`  Send     : ${ethers.formatEther(vfideAmt)} VFIDE + ${ethers.formatEther(ethAmt)} ETH`);

  // ── Pre-flight balance checks ─────────────────────────────────────────────
  const token = await ethers.getContractAt("VFIDEToken", tokenAddr);
  const funderVFIDE = await token.balanceOf(deployer.address);
  if (funderVFIDE < vfideAmt) {
    throw new Error(
      `Insufficient VFIDE balance: have ${ethers.formatEther(funderVFIDE)}, ` +
      `need ${ethers.formatEther(vfideAmt)}.`,
    );
  }
  const funderETH = await ethers.provider.getBalance(deployer.address);
  // Reserve ~0.005 ETH for gas overhead
  const gasReserve = ethers.parseEther("0.005");
  if (funderETH < ethAmt + gasReserve) {
    throw new Error(
      `Insufficient ETH balance: have ${ethers.formatEther(funderETH)}, ` +
      `need ${ethers.formatEther(ethAmt + gasReserve)} (incl. gas reserve).`,
    );
  }

  // ── Send VFIDE ────────────────────────────────────────────────────────────
  // Faucet must be systemExempt (or the funder must be) for this to skip
  // burn-router fees. The deployer is whitelisted at genesis, so this works
  // during bootstrap. After AdminMultiSig handover, fund via systemExempt.
  console.log("\n→ Transferring VFIDE...");
  const txVFIDE = await token.transfer(faucetAddr, vfideAmt);
  await txVFIDE.wait();
  console.log(`  ✅ tx: ${txVFIDE.hash}`);

  // ── Send ETH ──────────────────────────────────────────────────────────────
  console.log("\n→ Transferring ETH for gas pool...");
  const txETH = await deployer.sendTransaction({ to: faucetAddr, value: ethAmt });
  await txETH.wait();
  console.log(`  ✅ tx: ${txETH.hash}`);

  // ── Optional: add operator ────────────────────────────────────────────────
  const operator = process.env.FAUCET_OPERATOR_ADDRESS?.trim();
  if (operator && ethers.isAddress(operator)) {
    console.log(`\n→ Adding operator ${operator}...`);
    const faucet = await ethers.getContractAt("VFIDETestnetFaucet", faucetAddr);
    try {
      const tx = await faucet.setOperator(operator, true);
      await tx.wait();
      console.log(`  ✅ tx: ${tx.hash}`);
    } catch (e: any) {
      console.log(`  ⏭  setOperator failed: ${e.reason ?? e.message?.slice(0, 80)}`);
      console.log(`     (Are you the faucet owner? Owner must call setOperator.)`);
    }
  }

  // ── Status ────────────────────────────────────────────────────────────────
  const faucet = await ethers.getContractAt("VFIDETestnetFaucet", faucetAddr);
  const status = await faucet.getFaucetStatus();
  console.log("\n═══ Faucet Status ═══");
  console.log(`  VFIDE balance     : ${ethers.formatEther(status[0])}`);
  console.log(`  ETH balance       : ${ethers.formatEther(status[1])}`);
  console.log(`  Total users       : ${status[2]}`);
  console.log(`  Total claimed     : ${ethers.formatEther(status[3])} VFIDE`);
  console.log(`  Claims today      : ${status[4]} / ${status[5]}`);
  console.log(`  Per-claim reward  : ${ethers.formatEther(status[6])} VFIDE + ${ethers.formatEther(status[7])} ETH`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
