import { ethers } from "hardhat";
import { Contract } from "ethers";

/**
 * Deployment script for Phases 3-6 smart contracts
 * 
 * Usage:
 * npx hardhat run contracts/scripts/deploy-phases-3-6.ts --network <network>
 */

interface DeploymentConfig {
  vfideToken: string;
  layerZeroEndpoint: string;
  chainlinkFeed?: string;
  uniswapPool?: string;
  uniswapPositionManager: string;
  quoteToken: string;
  treasury: string;
  owner: string;
}

interface DeployedContracts {
  // Phase 3
  vfideBridge: Contract;
  bridgeSecurityModule: Contract;
  priceOracle: Contract;
  
  // Phase 4
  vfideStaking: Contract;
  stakingRewards: Contract;
  governancePower: Contract;
  
  // Phase 5
  liquidityIncentivesV2: Contract;
  lpTokenTracker: Contract;
  
  // Phase 6
  vfideFlashLoan: Contract;
  vfideLending: Contract;
  collateralManager: Contract;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Get network configuration
  const config = getNetworkConfig();
  
  console.log("\n=== Starting Deployment ===\n");

  // Deploy Phase 3: Cross-Chain Integration & Oracle
  console.log("📦 Phase 3: Cross-Chain Integration & Oracle");
  const phase3 = await deployPhase3(config);

  // Deploy Phase 4: Staking & Rewards
  console.log("\n📦 Phase 4: Staking & Rewards");
  const phase4 = await deployPhase4(config);

  // Deploy Phase 5: Liquidity Mining
  console.log("\n📦 Phase 5: Liquidity Mining");
  const phase5 = await deployPhase5(config, phase3.priceOracle.address);

  // Deploy Phase 6: Advanced DeFi
  console.log("\n📦 Phase 6: Advanced DeFi Features");
  const phase6 = await deployPhase6(config, phase3.priceOracle.address, phase4.vfideStaking.address);

  // Configure contract integrations
  console.log("\n⚙️  Configuring Contract Integrations");
  await configureContracts({ ...phase3, ...phase4, ...phase5, ...phase6 });

  // Save deployment addresses
  const addresses = {
    // Phase 3
    vfideBridge: phase3.vfideBridge.address,
    bridgeSecurityModule: phase3.bridgeSecurityModule.address,
    priceOracle: phase3.priceOracle.address,
    
    // Phase 4
    vfideStaking: phase4.vfideStaking.address,
    stakingRewards: phase4.stakingRewards.address,
    governancePower: phase4.governancePower.address,
    
    // Phase 5
    liquidityIncentivesV2: phase5.liquidityIncentivesV2.address,
    lpTokenTracker: phase5.lpTokenTracker.address,
    
    // Phase 6
    vfideFlashLoan: phase6.vfideFlashLoan.address,
    vfideLending: phase6.vfideLending.address,
    collateralManager: phase6.collateralManager.address,
  };

  console.log("\n✅ Deployment Complete!");
  console.log("\n📝 Deployed Addresses:");
  console.log(JSON.stringify(addresses, null, 2));

  // Save to file
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs");
  const network = await ethers.provider.getNetwork();
  fs.writeFileSync(
    `deployments-${network.name}-${Date.now()}.json`,
    JSON.stringify(addresses, null, 2)
  );

  console.log("\n💾 Addresses saved to deployments file");
}

async function deployPhase3(config: DeploymentConfig) {
  // Deploy Bridge Security Module
  const BridgeSecurityModule = await ethers.getContractFactory("BridgeSecurityModule");
  const bridgeSecurityModule = await BridgeSecurityModule.deploy(config.owner, ethers.constants.AddressZero);
  await bridgeSecurityModule.deployed();
  console.log("  ✓ BridgeSecurityModule:", bridgeSecurityModule.address);

  // Deploy VFIDE Bridge
  const VFIDEBridge = await ethers.getContractFactory("VFIDEBridge");
  const vfideBridge = await VFIDEBridge.deploy(
    config.vfideToken,
    config.layerZeroEndpoint,
    config.owner
  );
  await vfideBridge.deployed();
  console.log("  ✓ VFIDEBridge:", vfideBridge.address);

  // Update bridge address in security module
  await bridgeSecurityModule.setBridge(vfideBridge.address);

  // Deploy Price Oracle
  const VFIDEPriceOracle = await ethers.getContractFactory("VFIDEPriceOracle");
  const priceOracle = await VFIDEPriceOracle.deploy(
    config.vfideToken,
    config.quoteToken,
    config.chainlinkFeed || ethers.constants.AddressZero,
    config.uniswapPool || ethers.constants.AddressZero,
    config.owner
  );
  await priceOracle.deployed();
  console.log("  ✓ VFIDEPriceOracle:", priceOracle.address);

  return { vfideBridge, bridgeSecurityModule, priceOracle };
}

async function deployPhase4(config: DeploymentConfig) {
  // Deploy Staking Rewards
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const stakingRewards = await StakingRewards.deploy(
    config.vfideToken,
    config.treasury,
    config.owner
  );
  await stakingRewards.deployed();
  console.log("  ✓ StakingRewards:", stakingRewards.address);

  // Deploy Governance Power
  const GovernancePower = await ethers.getContractFactory("GovernancePower");
  const governancePower = await GovernancePower.deploy(config.owner);
  await governancePower.deployed();
  console.log("  ✓ GovernancePower:", governancePower.address);

  // Deploy VFIDE Staking
  const VFIDEStaking = await ethers.getContractFactory("VFIDEStaking");
  const vfideStaking = await VFIDEStaking.deploy(
    config.vfideToken,
    config.treasury,
    config.owner
  );
  await vfideStaking.deployed();
  console.log("  ✓ VFIDEStaking:", vfideStaking.address);

  return { vfideStaking, stakingRewards, governancePower };
}

async function deployPhase5(config: DeploymentConfig, priceOracle: string) {
  // Deploy Liquidity Incentives V2
  const LiquidityIncentivesV2 = await ethers.getContractFactory("LiquidityIncentivesV2");
  const liquidityIncentivesV2 = await LiquidityIncentivesV2.deploy(
    config.vfideToken,
    config.uniswapPositionManager,
    config.owner
  );
  await liquidityIncentivesV2.deployed();
  console.log("  ✓ LiquidityIncentivesV2:", liquidityIncentivesV2.address);

  // Deploy LP Token Tracker
  const LPTokenTracker = await ethers.getContractFactory("LPTokenTracker");
  const lpTokenTracker = await LPTokenTracker.deploy(
    config.uniswapPositionManager,
    priceOracle,
    config.owner
  );
  await lpTokenTracker.deployed();
  console.log("  ✓ LPTokenTracker:", lpTokenTracker.address);

  return { liquidityIncentivesV2, lpTokenTracker };
}

async function deployPhase6(config: DeploymentConfig, priceOracle: string, stakingAddress: string) {
  // Deploy Collateral Manager
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy(priceOracle, config.owner);
  await collateralManager.deployed();
  console.log("  ✓ CollateralManager:", collateralManager.address);

  // Deploy VFIDE Lending
  const VFIDELending = await ethers.getContractFactory("VFIDELending");
  const vfideLending = await VFIDELending.deploy(
    config.vfideToken,
    collateralManager.address,
    priceOracle,
    config.owner
  );
  await vfideLending.deployed();
  console.log("  ✓ VFIDELending:", vfideLending.address);

  // Deploy Flash Loan
  const VFIDEFlashLoan = await ethers.getContractFactory("VFIDEFlashLoan");
  const vfideFlashLoan = await VFIDEFlashLoan.deploy(
    config.vfideToken,
    stakingAddress, // Fees go to stakers
    config.owner
  );
  await vfideFlashLoan.deployed();
  console.log("  ✓ VFIDEFlashLoan:", vfideFlashLoan.address);

  return { vfideFlashLoan, vfideLending, collateralManager };
}

async function configureContracts(contracts: DeployedContracts) {
  // Configure Bridge
  await contracts.vfideBridge.setSecurityModule(contracts.bridgeSecurityModule.address);
  console.log("  ✓ Bridge configured with security module");

  // Configure Staking
  await contracts.vfideStaking.setRewardsContract(contracts.stakingRewards.address);
  await contracts.vfideStaking.setGovernancePower(contracts.governancePower.address);
  console.log("  ✓ Staking configured");

  // Configure Staking Rewards
  await contracts.stakingRewards.setStakingContract(contracts.vfideStaking.address);
  console.log("  ✓ Staking Rewards configured");

  // Configure Governance Power
  await contracts.governancePower.setStakingContract(contracts.vfideStaking.address);
  console.log("  ✓ Governance Power configured");

  // Configure Collateral Manager
  await contracts.collateralManager.setLendingContract(contracts.vfideLending.address);
  console.log("  ✓ Collateral Manager configured");
}

function getNetworkConfig(): DeploymentConfig {
  const network = process.env.HARDHAT_NETWORK || "hardhat";

  // Base Network Configuration
  if (network === "base") {
    return {
      vfideToken: process.env.VFIDE_TOKEN_BASE || "",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // Base LayerZero Endpoint
      uniswapPositionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1", // Base Uniswap V3
      quoteToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      treasury: process.env.TREASURY_ADDRESS || "",
      owner: process.env.OWNER_ADDRESS || "",
    };
  }

  // Polygon Network Configuration
  if (network === "polygon") {
    return {
      vfideToken: process.env.VFIDE_TOKEN_POLYGON || "",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // Polygon LayerZero Endpoint
      chainlinkFeed: process.env.CHAINLINK_FEED_POLYGON || "",
      uniswapPool: process.env.UNISWAP_POOL_POLYGON || "",
      uniswapPositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Polygon Uniswap V3
      quoteToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
      treasury: process.env.TREASURY_ADDRESS || "",
      owner: process.env.OWNER_ADDRESS || "",
    };
  }

  // Default/Testnet Configuration
  return {
    vfideToken: process.env.VFIDE_TOKEN || "",
    layerZeroEndpoint: process.env.LAYERZERO_ENDPOINT || "",
    chainlinkFeed: process.env.CHAINLINK_FEED || "",
    uniswapPool: process.env.UNISWAP_POOL || "",
    uniswapPositionManager: process.env.UNISWAP_POSITION_MANAGER || "",
    quoteToken: process.env.QUOTE_TOKEN || "",
    treasury: process.env.TREASURY_ADDRESS || "",
    owner: process.env.OWNER_ADDRESS || "",
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
