import hre from "hardhat";
import { Contract } from "ethers";

const ethers = (hre as any).ethers;

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
  if (!deployer) {
    throw new Error('No deployer signer available');
  }
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());

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
  const priceOracleAddress = await phase3.priceOracle.getAddress();
  const phase5 = await deployPhase5(config, priceOracleAddress);

  // Deploy Phase 6: Advanced DeFi
  console.log("\n📦 Phase 6: Advanced DeFi Features");
  const stakingAddress = await phase4.vfideStaking.getAddress();
  const phase6 = await deployPhase6(config, priceOracleAddress, stakingAddress);

  // Configure contract integrations
  console.log("\n⚙️  Configuring Contract Integrations");
  await configureContracts({ ...phase3, ...phase4, ...phase5, ...phase6 });

  // Save deployment addresses
  const addresses = {
    // Phase 3
    vfideBridge: await phase3.vfideBridge.getAddress(),
    bridgeSecurityModule: await phase3.bridgeSecurityModule.getAddress(),
    priceOracle: priceOracleAddress,
    
    // Phase 4
    vfideStaking: stakingAddress,
    stakingRewards: await phase4.stakingRewards.getAddress(),
    governancePower: await phase4.governancePower.getAddress(),
    
    // Phase 5
    liquidityIncentivesV2: await phase5.liquidityIncentivesV2.getAddress(),
    lpTokenTracker: await phase5.lpTokenTracker.getAddress(),
    
    // Phase 6
    vfideFlashLoan: await phase6.vfideFlashLoan.getAddress(),
    vfideLending: await phase6.vfideLending.getAddress(),
    collateralManager: await phase6.collateralManager.getAddress(),
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

const waitForDeployment = async (contract: Contract) => {
  const contractWithWait = contract as Contract & { waitForDeployment?: () => Promise<void>; deployed?: () => Promise<void> };
  if (contractWithWait.waitForDeployment) {
    await contractWithWait.waitForDeployment();
    return;
  }
  if (contractWithWait.deployed) {
    await contractWithWait.deployed();
  }
};

async function deployPhase3(config: DeploymentConfig) {
  // Deploy Bridge Security Module
  const BridgeSecurityModule = await ethers.getContractFactory("BridgeSecurityModule");
  const bridgeSecurityModule = await BridgeSecurityModule.deploy(
    config.owner,
    ethers.ZeroAddress
  ) as Contract & { setBridge: (address: string) => Promise<void> };
  await waitForDeployment(bridgeSecurityModule);
  console.log("  ✓ BridgeSecurityModule:", await bridgeSecurityModule.getAddress());

  // Deploy VFIDE Bridge
  const VFIDEBridge = await ethers.getContractFactory("VFIDEBridge");
  const vfideBridge = await VFIDEBridge.deploy(
    config.vfideToken,
    config.layerZeroEndpoint,
    config.owner
  );
  await waitForDeployment(vfideBridge);
  console.log("  ✓ VFIDEBridge:", await vfideBridge.getAddress());

  // Update bridge address in security module
  await bridgeSecurityModule.setBridge(await vfideBridge.getAddress());

  // Deploy Price Oracle
  const VFIDEPriceOracle = await ethers.getContractFactory("VFIDEPriceOracle");
  const priceOracle = await VFIDEPriceOracle.deploy(
    config.vfideToken,
    config.quoteToken,
    config.chainlinkFeed || ethers.ZeroAddress,
    config.uniswapPool || ethers.ZeroAddress,
    config.owner
  );
  await waitForDeployment(priceOracle);
  console.log("  ✓ VFIDEPriceOracle:", await priceOracle.getAddress());

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
  await waitForDeployment(stakingRewards);
  console.log("  ✓ StakingRewards:", await stakingRewards.getAddress());

  // Deploy Governance Power
  const GovernancePower = await ethers.getContractFactory("GovernancePower");
  const governancePower = await GovernancePower.deploy(config.owner);
  await waitForDeployment(governancePower);
  console.log("  ✓ GovernancePower:", await governancePower.getAddress());

  // Deploy VFIDE Staking
  const VFIDEStaking = await ethers.getContractFactory("VFIDEStaking");
  const vfideStaking = await VFIDEStaking.deploy(
    config.vfideToken,
    config.treasury,
    config.owner
  );
  await waitForDeployment(vfideStaking);
  console.log("  ✓ VFIDEStaking:", await vfideStaking.getAddress());

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
  await waitForDeployment(liquidityIncentivesV2);
  console.log("  ✓ LiquidityIncentivesV2:", await liquidityIncentivesV2.getAddress());

  // Deploy LP Token Tracker
  const LPTokenTracker = await ethers.getContractFactory("LPTokenTracker");
  const lpTokenTracker = await LPTokenTracker.deploy(
    config.uniswapPositionManager,
    priceOracle,
    config.owner
  );
  await waitForDeployment(lpTokenTracker);
  console.log("  ✓ LPTokenTracker:", await lpTokenTracker.getAddress());

  return { liquidityIncentivesV2, lpTokenTracker };
}

async function deployPhase6(config: DeploymentConfig, priceOracle: string, stakingAddress: string) {
  // Deploy Collateral Manager
  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy(priceOracle, config.owner);
  await waitForDeployment(collateralManager);
  console.log("  ✓ CollateralManager:", await collateralManager.getAddress());

  // Deploy VFIDE Lending
  const VFIDELending = await ethers.getContractFactory("VFIDELending");
  const vfideLending = await VFIDELending.deploy(
    config.vfideToken,
    await collateralManager.getAddress(),
    priceOracle,
    config.owner
  );
  await waitForDeployment(vfideLending);
  console.log("  ✓ VFIDELending:", await vfideLending.getAddress());

  // Deploy Flash Loan
  const VFIDEFlashLoan = await ethers.getContractFactory("VFIDEFlashLoan");
  const vfideFlashLoan = await VFIDEFlashLoan.deploy(
    config.vfideToken,
    stakingAddress, // Fees go to stakers
    config.owner
  );
  await waitForDeployment(vfideFlashLoan);
  console.log("  ✓ VFIDEFlashLoan:", await vfideFlashLoan.getAddress());

  return { vfideFlashLoan, vfideLending, collateralManager };
}

async function configureContracts(contracts: DeployedContracts) {
  const vfideBridge = contracts.vfideBridge as Contract & { setSecurityModule: (address: string) => Promise<void> };
  const vfideStaking = contracts.vfideStaking as Contract & {
    setRewardsContract: (address: string) => Promise<void>;
    setGovernancePower: (address: string) => Promise<void>;
  };
  const stakingRewards = contracts.stakingRewards as Contract & { setStakingContract: (address: string) => Promise<void> };
  const governancePower = contracts.governancePower as Contract & { setStakingContract: (address: string) => Promise<void> };
  const collateralManager = contracts.collateralManager as Contract & { setLendingContract: (address: string) => Promise<void> };
  // Configure Bridge
  await vfideBridge.setSecurityModule(await contracts.bridgeSecurityModule.getAddress());
  console.log("  ✓ Bridge configured with security module");

  // Configure Staking
  await vfideStaking.setRewardsContract(await contracts.stakingRewards.getAddress());
  await vfideStaking.setGovernancePower(await contracts.governancePower.getAddress());
  console.log("  ✓ Staking configured");

  // Configure Staking Rewards
  await stakingRewards.setStakingContract(await contracts.vfideStaking.getAddress());
  console.log("  ✓ Staking Rewards configured");

  // Configure Governance Power
  await governancePower.setStakingContract(await contracts.vfideStaking.getAddress());
  console.log("  ✓ Governance Power configured");

  // Configure Collateral Manager
  await collateralManager.setLendingContract(await contracts.vfideLending.getAddress());
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
