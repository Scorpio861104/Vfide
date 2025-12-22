const { ethers } = require("hardhat");

async function deployContracts(owner, dao, user1, user2, merchant1, merchant2) {
    // Deploy presale mock first (Token requires presale as a deployed contract)
    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    const presaleMock = await PresaleMock.deploy();
    await presaleMock.waitForDeployment();

    const DevVault = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVault = await DevVault.deploy();
    await devVault.waitForDeployment();

    const Token = await ethers.getContractFactory("VFIDEToken");
    // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
    const token = await Token.deploy(
        devVault.target,           // devReserveVestingVault
        presaleMock.target,        // presale contract (must be a contract)
        owner.address,             // treasury
        ethers.ZeroAddress,        // vaultHub (can be zero - no extcodesize check)
        ethers.ZeroAddress,        // ledger (can be zero - no extcodesize check)
        owner.address              // treasurySink
    );
    await token.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Security = await ethers.getContractFactory("SecurityHubMock");
    const security = await Security.deploy();
    await security.waitForDeployment();

    const Registry = await ethers.getContractFactory("MerchantRegistry");
    // Manual deployment for MerchantRegistry to avoid invalid overrides error
    const registryTx = await Registry.getDeployTransaction(dao.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    const registryResponse = await owner.sendTransaction(registryTx);
    const registryReceipt = await registryResponse.wait();
    const registry = Registry.attach(registryReceipt.contractAddress);
    await registry.waitForDeployment();

    const BurnRouter = await ethers.getContractFactory("ProofScoreBurnRouter");
    // Manual deployment for BurnRouter to avoid invalid overrides error
    const burnRouterTx = await BurnRouter.getDeployTransaction(seer.target, dao.address, ethers.ZeroAddress, dao.address);
    const burnRouterResponse = await owner.sendTransaction(burnRouterTx);
    const burnRouterReceipt = await burnRouterResponse.wait();
    const burnRouter = BurnRouter.attach(burnRouterReceipt.contractAddress);
    await burnRouter.waitForDeployment();

    // Deploy Escrow
    const CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    // Manual deployment for CommerceEscrow to avoid invalid overrides error
    // Constructor: dao, token, hub, merchants, sec, ledger
    const escrowTx = await CommerceEscrow.getDeployTransaction(dao.address, token.target, vaultHub.target, registry.target, security.target, ledger.target);
    const escrowResponse = await owner.sendTransaction(escrowTx);
    const escrowReceipt = await escrowResponse.wait();
    const escrow = CommerceEscrow.attach(escrowReceipt.contractAddress);
    await escrow.waitForDeployment();

    await seer.setMin(500);
    await registry.connect(dao).setPolicy(500, 5, 5);
    await seer.setScore(user1.address, 600);
    await vaultHub.connect(dao).setVault(user1.address, user1.address);
    
    // Disable vaultOnly mode to simplify testing
    await token.connect(owner).setVaultOnly(false);
    
    // Token is pre-minted at construction - owner already has tokens from treasury allocation
    // No need to mint - transfer from owner's balance instead

    return { token, vaultHub, seer, ledger, registry, escrow, merchant: registry, security, burnRouter };
}

async function deployCommerce(owner, dao) {
    // Deploy presale mock first (Token requires presale as a deployed contract)
    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    const presaleMock = await PresaleMock.deploy();
    await presaleMock.waitForDeployment();

    const DevVault = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVault = await DevVault.deploy();
    await devVault.waitForDeployment();

    const Token = await ethers.getContractFactory("VFIDEToken");
    // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
    const token = await Token.deploy(
        devVault.target,           // devReserveVestingVault
        presaleMock.target,        // presale contract (must be a contract)
        owner.address,             // treasury
        ethers.ZeroAddress,        // vaultHub (can be zero - no extcodesize check)
        ethers.ZeroAddress,        // ledger (can be zero - no extcodesize check)
        owner.address              // treasurySink
    );
    await token.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vault = await VaultHub.deploy();
    await vault.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Security = await ethers.getContractFactory("SecurityHubMock");
    const security = await Security.deploy();
    await security.waitForDeployment();

    const Registry = await ethers.getContractFactory("MerchantRegistry");
    const registry = await Registry.deploy(dao.address, token.target, vault.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    const CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    // Constructor: dao, token, hub, merchants, sec, ledger
    const escrow = await CommerceEscrow.deploy(dao.address, token.target, vault.target, registry.target, security.target, ledger.target);
    await escrow.waitForDeployment();

    await token.connect(owner).setVaultOnly(false);

    return { token, vault, seer, ledger, registry, escrow };
}

module.exports = {
    deployContracts,
    deployCommerce,
};
