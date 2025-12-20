const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🚀 Starting Sepolia Deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. Deploy ProofLedger
  console.log("\n1. Deploying ProofLedger...");
  const ProofLedger = await ethers.getContractFactory("contracts/VFIDETrust.sol:ProofLedger");
  const ledger = await ProofLedger.deploy(deployer.address);
  await ledger.waitForDeployment();
  console.log("ProofLedger deployed to:", ledger.target);

  // 2. Deploy VaultInfrastructure (VaultHub)
  console.log("\n2. Deploying VaultInfrastructure...");
  const VaultHub = await ethers.getContractFactory("contracts/VaultInfrastructure.sol:VaultHub");
  // Deploy with placeholders to resolve circular dependency (VaultHub -> SecurityHub -> PanicGuard -> VaultHub)
  const vaultHub = await VaultHub.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ledger.target, deployer.address);
  await vaultHub.waitForDeployment();
  console.log("VaultHub deployed to:", vaultHub.target);

  // 3. Deploy VFIDESecurity (SecurityHub, etc.)
  // We need to deploy the components first: GuardianRegistry, GuardianLock, PanicGuard, EmergencyBreaker
  console.log("\n3. Deploying VFIDESecurity components...");
  
  const GuardianRegistry = await ethers.getContractFactory("contracts/VFIDESecurity.sol:GuardianRegistry");
  const guardianRegistry = await GuardianRegistry.deploy(deployer.address);
  await guardianRegistry.waitForDeployment();
  console.log("GuardianRegistry deployed to:", guardianRegistry.target);

  const GuardianLock = await ethers.getContractFactory("contracts/VFIDESecurity.sol:GuardianLock");
  const guardianLock = await GuardianLock.deploy(deployer.address, guardianRegistry.target, ledger.target);
  await guardianLock.waitForDeployment();
  console.log("GuardianLock deployed to:", guardianLock.target);

  const PanicGuard = await ethers.getContractFactory("contracts/VFIDESecurity.sol:PanicGuard");
  const panicGuard = await PanicGuard.deploy(deployer.address, ledger.target, vaultHub.target);
  await panicGuard.waitForDeployment();
  console.log("PanicGuard deployed to:", panicGuard.target);

  const EmergencyBreaker = await ethers.getContractFactory("contracts/VFIDESecurity.sol:EmergencyBreaker");
  const emergencyBreaker = await EmergencyBreaker.deploy(deployer.address, ledger.target);
  await emergencyBreaker.waitForDeployment();
  console.log("EmergencyBreaker deployed to:", emergencyBreaker.target);

  const SecurityHub = await ethers.getContractFactory("contracts/VFIDESecurity.sol:SecurityHub");
  const securityHub = await SecurityHub.deploy(
      deployer.address, 
      guardianLock.target, 
      panicGuard.target, 
      emergencyBreaker.target, 
      ledger.target
  );
  await securityHub.waitForDeployment();
  console.log("SecurityHub deployed to:", securityHub.target);

  // 4. Deploy VFIDEFinance (StablecoinRegistry)
  console.log("\n4. Deploying VFIDEFinance...");
  const StablecoinRegistry = await ethers.getContractFactory("contracts/VFIDEFinance.sol:StablecoinRegistry");
  const stablecoinRegistry = await StablecoinRegistry.deploy(deployer.address, ledger.target);
  await stablecoinRegistry.waitForDeployment();
  console.log("StablecoinRegistry deployed to:", stablecoinRegistry.target);

  // 5. Circular Dependency: Token <-> DevVault <-> Presale
  console.log("\n5. Handling Circular Dependencies (Token <-> DevVault <-> Presale)...");
  
  const currentNonce = await deployer.getNonce();
  console.log("Current Nonce:", currentNonce);

  // Predicted addresses
  // Nonce N: VFIDEPresale
  // Nonce N+1: DevReserveVestingVault
  // Nonce N+2: VFIDEToken
  
  const presaleAddress = ethers.getCreateAddress({ from: deployer.address, nonce: currentNonce });
  const devVaultAddress = ethers.getCreateAddress({ from: deployer.address, nonce: currentNonce + 1 });
  const tokenAddress = ethers.getCreateAddress({ from: deployer.address, nonce: currentNonce + 2 });

  console.log("Predicted Presale Address:", presaleAddress);
  console.log("Predicted DevVault Address:", devVaultAddress);
  console.log("Predicted Token Address:", tokenAddress);

  // Deploy VFIDEPresale (Nonce N)
  console.log("Deploying VFIDEPresale...");
  const VFIDEPresale = await ethers.getContractFactory("contracts/VFIDEPresale.sol:VFIDEPresale");
  const presale = await VFIDEPresale.deploy(
      deployer.address, // dao
      tokenAddress, // pre-computed token address
      deployer.address, // treasury
      Math.floor(Date.now() / 1000) + 86400 // startTime: 1 day from now
  );
  await presale.waitForDeployment();
  console.log("VFIDEPresale deployed to:", presale.target);
  if (presale.target !== presaleAddress) {
      throw new Error(`Nonce mismatch! Expected ${presaleAddress}, got ${presale.target}`);
  }

  // Deploy DevReserveVestingVault (Nonce N+1)
  console.log("Deploying DevReserveVestingVault...");
  const DevReserveVestingVault = await ethers.getContractFactory("contracts/DevReserveVestingVault.sol:DevReserveVestingVault");
  const devVault = await DevReserveVestingVault.deploy(
      tokenAddress,
      deployer.address, // beneficiary
      vaultHub.target,
      securityHub.target,
      ledger.target,
      presaleAddress,
      ethers.parseEther("50000000") // 50M allocation
  );
  await devVault.waitForDeployment();
  console.log("DevReserveVestingVault deployed to:", devVault.target);
  if (devVault.target !== devVaultAddress) {
      throw new Error(`Nonce mismatch! Expected ${devVaultAddress}, got ${devVault.target}`);
  }

  // Deploy VFIDEToken (Nonce N+2)
  console.log("Deploying VFIDEToken...");
  const VFIDEToken = await ethers.getContractFactory("contracts/VFIDEToken.sol:VFIDEToken");
  // constructor(devReserveVestingVault, presale, treasury, _vaultHub, _ledger, _treasurySink)
  const token = await VFIDEToken.deploy(
      devVault.target,
      presale.target,
      deployer.address, // treasury
      vaultHub.target,
      ledger.target,
      ethers.ZeroAddress // Set Treasury later
  );
  await token.waitForDeployment();
  console.log("VFIDEToken deployed to:", token.target);
  if (token.target !== tokenAddress) {
      throw new Error(`Nonce mismatch! Expected ${tokenAddress}, got ${token.target}`);
  }

  // 6. Deploy EcoTreasuryVault (needs Token)
  console.log("\n6. Deploying EcoTreasuryVault...");
  const EcoTreasuryVault = await ethers.getContractFactory("contracts/VFIDEFinance.sol:EcoTreasuryVault");
  const treasury = await EcoTreasuryVault.deploy(
      deployer.address,
      ledger.target,
      stablecoinRegistry.target,
      token.target
  );
  await treasury.waitForDeployment();
  console.log("EcoTreasuryVault deployed to:", treasury.target);

  // Set Treasury in Token
  console.log("Setting Treasury in Token...");
  await token.setTreasurySink(treasury.target);

  // 7. Deploy VFIDETrust (Seer, BurnRouter)
  console.log("\n7. Deploying VFIDETrust components...");
  const Seer = await ethers.getContractFactory("contracts/VFIDETrust.sol:Seer");
  const seer = await Seer.deploy(deployer.address, ledger.target, vaultHub.target);
  await seer.waitForDeployment();
  console.log("Seer deployed to:", seer.target);

  const BurnRouter = await ethers.getContractFactory("contracts/VFIDETrust.sol:ProofScoreBurnRouterPlus");
  // constructor(address _seer, address _treasury, address _sanctum, address _vfide)
  // We need SanctumVault.
  
  console.log("Deploying SanctumVault...");
  const SanctumVault = await ethers.getContractFactory("contracts/SanctumVault.sol:SanctumVault");
  const sanctum = await SanctumVault.deploy(deployer.address, ledger.target);
  await sanctum.waitForDeployment();
  console.log("SanctumVault deployed to:", sanctum.target);

  console.log("Deploying ProofScoreBurnRouterPlus...");
  const burnRouter = await BurnRouter.deploy(
      seer.target,
      treasury.target,
      sanctum.target,
      token.target
  );
  await burnRouter.waitForDeployment();
  console.log("ProofScoreBurnRouterPlus deployed to:", burnRouter.target);

  // Set BurnRouter in Token
  console.log("Setting BurnRouter in Token...");
  await token.setBurnRouter(burnRouter.target);

  // 8. Deploy VFIDECommerce
  console.log("\n8. Deploying VFIDECommerce...");
  const MerchantRegistry = await ethers.getContractFactory("contracts/VFIDECommerce.sol:MerchantRegistry");
  const merchantRegistry = await MerchantRegistry.deploy(
      deployer.address,
      token.target,
      vaultHub.target,
      seer.target,
      securityHub.target,
      ledger.target
  );
  await merchantRegistry.waitForDeployment();
  console.log("MerchantRegistry deployed to:", merchantRegistry.target);

  const CommerceEscrow = await ethers.getContractFactory("contracts/VFIDECommerce.sol:CommerceEscrow");
  const escrow = await CommerceEscrow.deploy(
      deployer.address,
      token.target,
      vaultHub.target,
      merchantRegistry.target,
      securityHub.target,
      ledger.target
  );
  await escrow.waitForDeployment();
  console.log("CommerceEscrow deployed to:", escrow.target);

  // 9. Deploy DAO
  console.log("\n9. Deploying DAO...");
  const DAOTimelock = await ethers.getContractFactory("contracts/DAOTimelock.sol:DAOTimelock");
  const timelock = await DAOTimelock.deploy(deployer.address); // Admin is deployer initially
  await timelock.waitForDeployment();
  console.log("DAOTimelock deployed to:", timelock.target);

  const GovernanceHooks = await ethers.getContractFactory("contracts/GovernanceHooks.sol:GovernanceHooks");
  const hooks = await GovernanceHooks.deploy(deployer.address, ledger.target);
  await hooks.waitForDeployment();
  console.log("GovernanceHooks deployed to:", hooks.target);

  const DAO = await ethers.getContractFactory("contracts/DAO.sol:DAO");
  const dao = await DAO.deploy(
      deployer.address,
      timelock.target,
      seer.target,
      vaultHub.target,
      hooks.target
  );
  await dao.waitForDeployment();
  console.log("DAO deployed to:", dao.target);

  // 10. Deploy SystemHandover and Transfer Admin Rights
  console.log("\n10. Deploying SystemHandover and Transferring Admin Rights...");
  const SystemHandover = await ethers.getContractFactory("contracts/SystemHandover.sol:SystemHandover");
  const handover = await SystemHandover.deploy(
      deployer.address, // devMultisig
      dao.target,
      timelock.target,
      seer.target,
      ledger.target
  );
  await handover.waitForDeployment();
  console.log("SystemHandover deployed to:", handover.target);

  // Transfer Admin Rights to SystemHandover
  console.log("Transferring DAO Admin to SystemHandover...");
  await dao.setAdmin(handover.target);
  console.log("Transferring Timelock Admin to SystemHandover...");
  await timelock.setAdmin(handover.target);
  console.log("✅ Admin rights transferred.");

  // 11. Configure MerchantRegistry Reporter
  console.log("\n11. Configuring MerchantRegistry Reporter...");
  await merchantRegistry.setReporter(escrow.target, true);
  console.log("✅ Escrow set as reporter.");

  console.log("\n✅ Deployment Complete!");
  console.log("----------------------------------------------------");
  console.log("ProofLedger:", ledger.target);
  console.log("VaultHub:", vaultHub.target);
  console.log("SecurityHub:", securityHub.target);
  console.log("StablecoinRegistry:", stablecoinRegistry.target);
  console.log("DevReserveVestingVault:", devVault.target);
  console.log("VFIDEPresale:", presale.target);
  console.log("VFIDEToken:", token.target);
  console.log("EcoTreasuryVault:", treasury.target);
  console.log("Seer:", seer.target);
  console.log("SanctumVault:", sanctum.target);
  console.log("ProofScoreBurnRouterPlus:", burnRouter.target);
  console.log("MerchantRegistry:", merchantRegistry.target);
  console.log("CommerceEscrow:", escrow.target);
  console.log("DAOTimelock:", timelock.target);
  console.log("DAO:", dao.target);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
