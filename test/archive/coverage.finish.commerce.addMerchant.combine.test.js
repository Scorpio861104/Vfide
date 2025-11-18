const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.combine", function () {
  it("executes both true and false arms for addMerchant lines ~118 and ~130 (explicit + msg.sender)", async function () {
    const [deployer, alice, novault, vaultOwner] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const erc = await ERC20.deploy("TF", "TF");
    await erc.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vault = await VaultHub.deploy();
    await vault.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    // Prepare seer/vault before MerchantRegistry deploy so minScore is correct
    await seer.setMin(1);
    await seer.setScore(alice.address, 1);
    await seer.setScore(novault.address, 0);
    // give alice a vault, leave novault without one
    await vault.setVault(alice.address, vaultOwner.address);

    const MR = await ethers.getContractFactory("MerchantRegistry");
    const ZERO = '0x0000000000000000000000000000000000000000';
    const mr = await MR.deploy(deployer.address, erc.target, vault.target, seer.target, ZERO, ledger.target);
    await mr.waitForDeployment();

    // Register alice (so she is a merchant)
    const META = '0x' + '00'.repeat(32);
    await mr.connect(alice).addMerchant(META);

    // --- EXPLICIT-address helpers for line ~118 (alreadyMerchant OR force)
    // novault: not registered -> false arm
    const explicitFalse = await mr.TEST_line118_already_or_force(novault.address, false);
    expect(explicitFalse).to.equal(false);

    // alice: registered -> true arm
    const explicitTrue = await mr.TEST_line118_already_or_force(alice.address, false);
    expect(explicitTrue).to.equal(true);

    // --- msg.sender variant for line ~118
    const msgFalse = await mr.connect(novault).TEST_if_msgsender_alreadyMerchant();
    expect(msgFalse).to.equal(false);
    const msgTrue = await mr.connect(alice).TEST_if_msgsender_alreadyMerchant();
    expect(msgTrue).to.equal(true);

    // --- msg.sender helpers for line ~130 (vaultZero OR force)
    // alice has a vault -> false arm
    const lvFalse = await mr.connect(alice).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(lvFalse).to.equal(false);

    // novault has no vault -> true arm
    const lvTrue = await mr.connect(novault).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(lvTrue).to.equal(true);

    // Now hit the force-right arm for a case that would otherwise be false
    await mr.TEST_setForceNoVault(true);
    const forced = await mr.connect(alice).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(forced).to.equal(true);
    await mr.TEST_setForceNoVault(false);

    // --- explicit vaultZero/or helper (targets same source line as production check)
    const explicitVaultFalse = await mr.TEST_line130_vaultZero_or_force(alice.address, alice.address, false);
    expect(explicitVaultFalse).to.equal(false);
    const explicitVaultTrue = await mr.TEST_line130_vaultZero_or_force(alice.address, novault.address, false);
    expect(explicitVaultTrue).to.equal(true);
  });
});
