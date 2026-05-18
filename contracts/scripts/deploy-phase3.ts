/**
 * @fileoverview Hardhat deployment script for Phase 3 — Cross-Chain Bridge & Oracle
 *
 * HOWEY COMPLIANCE NOTICE:
 * Phases 4–6 (Staking, Liquidity Mining, Advanced DeFi) have been removed to ensure
 * compliance with the Howey Test.  Only Phase 3 (Bridge + Oracle) is deployed here.
 *
 * Deployment order (two-step because VFIDEBridge imports OZ while BSM/Oracle use
 * custom SharedInterfaces primitives — mixing them in one transaction causes type
 * name collisions at compile time):
 *   Step 1 — DeployPhase3Peripherals  →  BridgeSecurityModule + VFIDEPriceOracle
 *   Step 2 — DeployPhase3 (VFIDEBridge) →  wire BSM ↔ Bridge
 */

import hre from "hardhat";
import { Contract } from "ethers";

const ethers = (hre as any).ethers;

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface Phase3Config {
  network: string;
  owner: string;
  vfideToken: string;
  layerZeroEndpoint: string;
  quoteToken: string;
  chainlinkFeed: string;   // may be zero address on testnets
  uniswapPool: string;     // may be zero address if TWAP not available yet
}

interface Phase3Addresses {
  bridgeSecurityModule: string;
  priceOracle: string;
  vfideBridge: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function required(name: string, value: string | undefined): string {
  if (!value || value === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(value: string | undefined): string {
  return value || ethers.ZeroAddress;
}

function getConfig(): Phase3Config {
  const network = process.env.HARDHAT_NETWORK || "hardhat";
  return {
    network,
    owner:               required("OWNER_ADDRESS",        process.env.OWNER_ADDRESS),
    vfideToken:          required("VFIDE_TOKEN",           process.env.VFIDE_TOKEN),
    layerZeroEndpoint:   required("LAYERZERO_ENDPOINT",    process.env.LAYERZERO_ENDPOINT),
    quoteToken:          required("QUOTE_TOKEN",           process.env.QUOTE_TOKEN),
    chainlinkFeed:       optional(process.env.CHAINLINK_FEED),
    uniswapPool:         optional(process.env.UNISWAP_POOL),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Phase 3 Deployment (Bridge & Oracle — Howey-Safe)\n");

  const config = getConfig();
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No signer available");
  console.log(`Deploying from: ${deployer.address}`);
  console.log(`Network: ${config.network}\n`);

  // ── Step 1: Deploy peripherals (BSM + Oracle — SharedInterfaces, no OZ) ──
  console.log("📦 Step 1: Deploy peripherals via DeployPhase3Peripherals…");
  const PeripheralsFactory = await ethers.getContractFactory("DeployPhase3Peripherals");
  const peripheralsDeployer: Contract = await PeripheralsFactory.deploy();
  await peripheralsDeployer.waitForDeployment();
  console.log(`   ✓ Peripherals deployer at: ${await peripheralsDeployer.getAddress()}`);

  const periTx = await (peripheralsDeployer as any).deployPeripherals(
    config.vfideToken,
    config.quoteToken,
    config.chainlinkFeed,
    config.uniswapPool,
    config.owner,
  );
  try {
    await periTx.wait();
  } catch (err: any) {
    throw new Error(`deployPeripherals transaction failed (BridgeSecurityModule + VFIDEPriceOracle): ${err.message}`);
  }
  const bsmAddr: string   = await (peripheralsDeployer as any).bsm();
  const oracleAddr: string = await (peripheralsDeployer as any).oracle();
  console.log(`   ✓ BridgeSecurityModule: ${bsmAddr}`);
  console.log(`   ✓ VFIDEPriceOracle:     ${oracleAddr}\n`);

  // ── Step 2: Deploy VFIDEBridge and wire BSM (OZ-based, LayerZero OApp) ──
  console.log("📦 Step 2: Deploy VFIDEBridge via DeployPhase3…");
  const Phase3Factory = await ethers.getContractFactory("DeployPhase3");
  const phase3Deployer: Contract = await Phase3Factory.deploy();
  await phase3Deployer.waitForDeployment();
  console.log(`   ✓ Phase3 deployer at: ${await phase3Deployer.getAddress()}`);

  const phase3Tx = await (phase3Deployer as any).deployAll(
    config.vfideToken,
    config.layerZeroEndpoint,
    bsmAddr,
    oracleAddr,
    config.owner,
  );
  try {
    await phase3Tx.wait();
  } catch (err: any) {
    throw new Error(`deployAll transaction failed (VFIDEBridge deployment + BSM wiring): ${err.message}`);
  }

  const deployed = await (phase3Deployer as any).deployed();
  const bridgeAddr: string = deployed.vfideBridge;
  console.log(`   ✓ VFIDEBridge: ${bridgeAddr}\n`);

  // ── Summary ──
  const addresses: Phase3Addresses = {
    bridgeSecurityModule: bsmAddr,
    priceOracle:          oracleAddr,
    vfideBridge:          bridgeAddr,
  };

  console.log("📊 Phase 3 Deployment Summary:");
  console.log("   ─────────────────────────────────────────────────────");
  console.log(`   BridgeSecurityModule: ${addresses.bridgeSecurityModule}`);
  console.log(`   VFIDEPriceOracle:     ${addresses.priceOracle}`);
  console.log(`   VFIDEBridge:          ${addresses.vfideBridge}`);
  console.log("   ─────────────────────────────────────────────────────\n");

  console.log("📝 Next Steps:");
  console.log("   1. Verify contracts on block explorer");
  console.log("   2. Call VFIDEBridge.confirmSecurityModule() after timelock expires");
  console.log("   3. Register trusted remotes on each chain (setTrustedRemote)");
  console.log("   4. Fund bridge with initial VFIDE liquidity if using pool model");
  console.log("   5. Announce bridge to community\n");

  // Save addresses to file
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs");
  const network = await ethers.provider.getNetwork();
  const filename = `deployments-phase3-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(addresses, null, 2));
  console.log(`💾 Addresses saved to: ${filename}`);

  // Optional verification
  if (process.env.VERIFY_CONTRACTS === "true") {
    await verifyContracts(addresses, config);
  }
}

async function verifyContracts(addresses: Phase3Addresses, config: Phase3Config) {
  console.log("\n🔍 Verifying contracts on block explorer…\n");

  const tryVerify = async (contractAddress: string, constructorArguments: unknown[]) => {
    try {
      await (hre as any).run("verify:verify", { address: contractAddress, constructorArguments });
      console.log(`   ✓ Verified: ${contractAddress}`);
    } catch (err: any) {
      if (err.message.includes("already verified")) {
        console.log(`   ℹ Already verified: ${contractAddress}`);
      } else {
        console.error(`   ✗ Failed: ${contractAddress}:`, err.message);
      }
    }
  };

  // BridgeSecurityModule(owner, bridge=owner temporary bootstrap value)
  await tryVerify(addresses.bridgeSecurityModule, [config.owner, config.owner]);

  // VFIDEPriceOracle(vfideToken, quoteToken, chainlinkFeed, uniswapPool, owner)
  await tryVerify(addresses.priceOracle, [
    config.vfideToken,
    config.quoteToken,
    config.chainlinkFeed,
    config.uniswapPool,
    config.owner,
  ]);

  // VFIDEBridge(vfideToken, endpoint, owner)
  await tryVerify(addresses.vfideBridge, [
    config.vfideToken,
    config.layerZeroEndpoint,
    config.owner,
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Phase 3 deployment failed:", error);
    process.exit(1);
  });
