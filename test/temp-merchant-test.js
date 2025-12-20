const { ethers } = require("hardhat");

describe("MerchantRegistry Deployment Test", function () {
  it("Should deploy MerchantRegistry", async function () {
    const [dao] = await ethers.getSigners();
    
    const DevVault = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVault = await DevVault.deploy();
    await devVault.waitForDeployment();

    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    const presaleMock = await PresaleMock.deploy();
    await presaleMock.waitForDeployment();

    const Token = await ethers.getContractFactory("VFIDEToken");
    // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
    const token = await Token.deploy(
        devVault.target,           // devReserveVestingVault (must be contract)
        presaleMock.target,        // presale contract (must be deployed contract!)
        dao.address,               // treasury
        ethers.ZeroAddress,        // vaultHub (can be zero)
        ethers.ZeroAddress,        // ledger (can be zero)
        dao.address                // treasurySink
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
    const registry = await Registry.deploy(dao.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();
  });
});
