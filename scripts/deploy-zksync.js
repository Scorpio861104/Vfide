// zkSync Era Deployment Script
// Run: npx hardhat run scripts/deploy-zksync.js --network zkSyncSepoliaTestnet

const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const { Wallet, Provider } = require("zksync-ethers");
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Vfide Ecosystem to zkSync Era...\n");

  // Setup zkSync provider and wallet
  const provider = new Provider(hre.network.config.url);
  const wallet = new Wallet(process.env.PRIVATE_KEY || "0x" + "1".repeat(64), provider);
  const deployer = new Deployer(hre, wallet);

  console.log("Deploying with wallet:", wallet.address);
  console.log("Wallet balance:", (await wallet.getBalance()).toString(), "ETH\n");

  // Deploy order based on dependencies
  const deploymentOrder = [
    // 1. Core Infrastructure
    { name: "ProofLedger", args: (contracts) => [wallet.address] },
    { name: "VaultInfrastructure" }, // Includes VaultHub
    
    // 2. Security Layer
    { name: "VFIDESecurity" }, // Includes GuardianRegistry, GuardianLock, PanicGuard, EmergencyBreaker, SecurityHub
    
    // 3. Token
    { 
      name: "VFIDEToken", 
      args: (contracts) => [
        contracts.VaultInfrastructure, // vaultHub
        contracts.VFIDESecurity, // securityHub
        contracts.ProofLedger, // ledger
        wallet.address // devReserveVault placeholder
      ]
    },
    
    // 4. Trust Layer
    { 
      name: "VFIDETrust", // Includes Seer, ProofScoreBurnRouterPlus
      args: (contracts) => [
        wallet.address, // dao
        contracts.VaultInfrastructure, // hub
        contracts.ProofLedger // ledger
      ]
    },
    
    // 5. Finance Layer
    {
      name: "VFIDEFinance", // Includes StablecoinRegistry, EcoTreasuryVault
      args: (contracts) => [
        wallet.address, // dao
        contracts.ProofLedger, // ledger
        contracts.VaultInfrastructure, // vaultHub
        contracts.VFIDEToken // vfide
      ]
    },
    
    // 6. Commerce Layer
    {
      name: "VFIDECommerce", // Includes MerchantRegistry, CommerceEscrow
      args: (contracts) => [
        wallet.address, // dao
        contracts.VFIDEToken, // token
        contracts.VaultInfrastructure, // vaultHub
        contracts.VFIDETrust, // seer (from Trust)
        contracts.VFIDESecurity, // security
        contracts.ProofLedger // ledger
      ]
    },
    
    // 7. Presale
    {
      name: "VFIDEPresale",
      args: (contracts) => [
        contracts.VFIDEToken,
        contracts.VaultInfrastructure,
        contracts.VFIDEFinance, // stablecoinRegistry
        contracts.VFIDESecurity,
        contracts.ProofLedger
      ]
    },
    
    // 8. Dev Vesting
    {
      name: "DevReserveVestingVault",
      args: (contracts) => [
        contracts.VFIDEToken,
        wallet.address, // beneficiary
        contracts.VaultInfrastructure,
        contracts.VFIDESecurity,
        contracts.ProofLedger,
        contracts.VFIDEPresale,
        40_000_000 // allocation
      ]
    },
    
    // 9. Governance
    {
      name: "DAO",
      args: (contracts) => [
        contracts.VFIDEToken,
        contracts.VFIDETrust, // seer
        contracts.VaultInfrastructure,
        contracts.ProofLedger
      ]
    },
    
    // 10. Emergency Control
    {
      name: "EmergencyControl",
      args: (contracts) => [
        wallet.address, // dao
        contracts.VFIDESecurity, // breaker
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
        contracts.VFIDETrust, // seer
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
      const args = config.args ? config.args(deployedContracts) : [];
      
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
