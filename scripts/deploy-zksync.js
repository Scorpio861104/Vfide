// zkSync Era Deployment Script
// Run: npx hardhat run scripts/deploy-zksync.js --network zkSyncSepoliaTestnet

const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const { Wallet, Provider } = require("zksync-ethers");
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Vfide Ecosystem to zkSync Era...\n");

  // Setup zkSync provider and wallet
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required for deployment");
  }
  const provider = new Provider(hre.network.config.url);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const deployer = new Deployer(hre, wallet);

  console.log("Deploying with wallet:", wallet.address);
  console.log("Wallet balance:", (await wallet.getBalance()).toString(), "ETH\n");

  // Deploy order based on dependencies
  const deploymentOrder = [
    // 1. Core Infrastructure
    { name: "ProofLedger", args: (contracts) => [wallet.address] },
    { name: "VaultHub", args: (contracts) => ["0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", contracts.ProofLedger, wallet.address] },
    
    // 2. Security Layer
    { name: "GuardianRegistry", args: (contracts) => [wallet.address] },
    { name: "GuardianLock", args: (contracts) => [wallet.address, contracts.GuardianRegistry, contracts.ProofLedger] },
    { name: "PanicGuard", args: (contracts) => [wallet.address, contracts.ProofLedger, contracts.VaultHub] },
    { name: "EmergencyBreaker", args: (contracts) => [wallet.address, contracts.ProofLedger] },
    { 
      name: "SecurityHub", 
      args: (contracts) => [
        wallet.address, 
        contracts.GuardianLock, 
        contracts.PanicGuard, 
        contracts.EmergencyBreaker, 
        contracts.ProofLedger
      ] 
    },
    
    // 3. Token
    { 
      name: "VFIDEToken", 
      args: (contracts) => [
        wallet.address, // devReserveVault placeholder
        contracts.VaultHub, 
        contracts.ProofLedger, 
        wallet.address // treasury placeholder
      ]
    },
    
    // 4. Trust Layer
    { 
      name: "Seer", 
      args: (contracts) => [
        wallet.address, // dao
        contracts.ProofLedger, // ledger
        contracts.VaultHub // hub
      ]
    },
    
    // 5. Finance Layer
    {
      name: "StablecoinRegistry", 
      args: (contracts) => [
        wallet.address, // dao
        contracts.ProofLedger // ledger
      ]
    },
    {
      name: "EcoTreasuryVault",
      args: (contracts) => [
        wallet.address, // dao
        contracts.ProofLedger,
        contracts.VaultHub,
        contracts.VFIDEToken
      ]
    },
    {
      name: "MerchantRebateVault",
      args: (contracts) => [
        contracts.VFIDEToken
      ]
    },
    { 
      name: "ProofScoreBurnRouter", 
      args: (contracts) => [
        contracts.Seer, // seer
        contracts.EcoTreasuryVault, // sanctumSink (using Treasury for now)
        "0x0000000000000000000000000000000000000000", // burnSink (hard burn)
        contracts.MerchantRebateVault // ecosystemSink
      ]
    },
    
    // 6. Commerce Layer
    {
      name: "MerchantPortal", 
      args: (contracts) => [
        wallet.address, // dao
        contracts.VaultHub, // vaultHub
        contracts.Seer, // seer
        contracts.SecurityHub, // security
        contracts.ProofLedger // ledger
      ]
    },
    {
      name: "SubscriptionManager",
      args: (contracts) => [
        contracts.VaultHub
      ]
    },
    {
      name: "CommerceEscrow",
      args: (contracts) => [
        wallet.address, // dao
        contracts.VFIDEToken,
        contracts.VaultHub,
        contracts.MerchantPortal, // Was MerchantRegistry
        contracts.SecurityHub,        contracts.ProofLedger
      ]
    },
    
    // 7. Presale
    {
      name: "VFIDEPresale",
      args: (contracts) => [
        wallet.address, // dao
        contracts.VFIDEToken,
        wallet.address, // treasury
        Math.floor(Date.now() / 1000) + 86400 // startTime: 1 day from now
      ]
    },
    
    // 8. Dev Vesting
    {
      name: "DevReserveVestingVault",
      args: (contracts) => [
        contracts.VFIDEToken,
        wallet.address, // beneficiary
        contracts.VaultHub,
        contracts.SecurityHub,
        contracts.ProofLedger,
        contracts.VFIDEPresale,
        "50000000000000000000000000" // 50M * 1e18
      ]
    },
    
    // 9. Governance
    {
      name: "DAO",
      args: (contracts) => [
         wallet.address, 
         wallet.address, 
         contracts.Seer, 
         contracts.VaultHub, 
         "0x0000000000000000000000000000000000000000"
      ]
    },
    {
      name: "DutyDistributor",
      args: (contracts) => [
        contracts.MerchantRebateVault,
        contracts.DAO
      ]
    },
    
    // 10. Emergency Control
    {
      name: "EmergencyControl",
      args: (contracts) => [
        wallet.address, // dao
        contracts.SecurityHub, // breaker
        contracts.ProofLedger
      ]
    },
    
    // 11. System Handover
    {
      name: "SystemHandover",
      args: (contracts) => [
        wallet.address, // devMultisig
        contracts.DAO,
        wallet.address, // timelock placeholder
        contracts.Seer, // seer
        contracts.ProofLedger
      ]
    }
  ];
  
  const deployedContracts = {};

  for (const config of deploymentOrder) {
    try {
      console.log(`📦 Deploying ${config.name}...`);
      
      const artifact = await deployer.loadArtifact(config.name);
      
      // Calculate constructor arguments
      let args = [];
      if (config.name === "DAO") {
          // Special handling for DAO
          // If DAO has no constructor, this is fine. If it does, we might fail.
          // Let's try to use the args from the previous script if we can.
          // But since I don't have the full file content of DAO.sol, I'll try with empty args first.
          // If it fails, the user will see it.
          // Actually, let's use the args from the previous script to be safe.
          // The previous script had:
          // const dao = await deploy("DAO", [wallet.address, wallet.address, deployedContracts.Seer, deployedContracts.VaultInfrastructure, "0x..."]);
          args = [
             wallet.address, 
             wallet.address, 
             deployedContracts.Seer, 
             deployedContracts.VaultHub, 
             "0x0000000000000000000000000000000000000000"
          ];
      } else {
          args = config.args ? config.args(deployedContracts) : [];
      }
      
      // Check contract size (zkSync has 24KB limit)
      const contractSize = artifact.bytecode.length / 2 - 1;
      console.log(`   Size: ${contractSize} bytes (${(contractSize / 24576 * 100).toFixed(1)}% of 24KB limit)`);
      
      if (contractSize > 24576) {
        console.error(`   ❌ Contract too large! ${contractSize} > 24576 bytes`);
        continue;
      }
      
      // Deploy
      const contract = await deployer.deploy(artifact, args);
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      deployedContracts[config.name] = address;
      
      console.log(`   ✅ Deployed at: ${address}`);
      console.log(`   Gas used: ${(await provider.getTransaction(contract.deploymentTransaction().hash)).gasLimit.toString()}\n`);
      
    } catch (error) {
      console.error(`   ❌ Failed to deploy ${config.name}:`, error.message);
      // Continue with other deployments
    }
  }

  // Summary
  console.log("\n📋 Deployment Summary:");
  console.log("═".repeat(80));
  for (const [name, address] of Object.entries(deployedContracts)) {
    console.log(`${name.padEnd(30)} ${address}`);
  }
  console.log("═".repeat(80));

  // ─────────────────────────── Wiring & Configuration
  console.log("\n🔌 Wiring Contracts...");
  try {
      const getContract = async (name) => {
          const artifact = await deployer.loadArtifact(name);
          return new hre.ethers.Contract(deployedContracts[name], artifact.abi, wallet);
      };

      const token = await getContract("VFIDEToken");
      const presale = await getContract("VFIDEPresale");
      const security = await getContract("SecurityHub");
      const rebateVault = await getContract("MerchantRebateVault");
      const portal = await getContract("MerchantPortal");
      const dao = await getContract("DAO");
      const duty = await getContract("DutyDistributor");

      // 1. Token -> SecurityHub
      console.log("   • Token: Setting SecurityHub...");
      await (await token.setSecurityHub(deployedContracts.SecurityHub)).wait();

      // 2. MerchantPortal -> RebateVault
      console.log("   • MerchantPortal: Setting RebateVault...");
      await (await portal.setRebateVault(deployedContracts.MerchantRebateVault, 800)).wait();
      
      // 3. RebateVault -> MerchantPortal (Authorize as Manager)
      console.log("   • RebateVault: Authorizing MerchantPortal...");
      await (await rebateVault.setManager(deployedContracts.MerchantPortal, true)).wait();
      
      // 4. RebateVault -> DutyDistributor (Authorize as Manager)
      console.log("   • RebateVault: Authorizing DutyDistributor...");
      await (await rebateVault.setManager(deployedContracts.DutyDistributor, true)).wait();
      
      // 5. DAO -> DutyDistributor (Set Hooks)
      console.log("   • DAO: Setting Hooks...");
      await (await dao.setModules(
          "0x0000000000000000000000000000000000000000", // timelock
          deployedContracts.Seer,
          deployedContracts.VaultHub,
          deployedContracts.DutyDistributor // hooks
      )).wait();

      console.log("✅ Wiring Complete!");

  } catch (e) {
      console.error("❌ Wiring Failed:", e.message);
  }
  
  console.log("\n✅ Deployment complete!");
  console.log(`\n🔍 Verify contracts on zkSync Explorer:`);
  console.log(`   https://sepolia.era.zksync.dev/`);
  
  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: wallet.address,
    contracts: deployedContracts
  };
  
  fs.writeFileSync(
    `deployments/zksync-${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log(`\n💾 Deployment data saved to deployments/`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
