const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.narrow4", function () {
  it("registers one signer and uses a no-vault signer to flip left/right msg.sender arms", async function () {
    const [deployer, registrar, novault, vaultOwner] = await ethers.getSigners();

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

  // Set up seer and vault BEFORE deploying MerchantRegistry so constructor reads correct minScore
  await seer.setMin(1);
  await seer.setScore(registrar.address, 1);
  await seer.setScore(novault.address, 0);
  await vault.setVault(registrar.address, vaultOwner.address);

  const MR = await ethers.getContractFactory("MerchantRegistry");
  const ZERO = '0x0000000000000000000000000000000000000000';
  const mr = await MR.deploy(deployer.address, erc.target, vault.target, seer.target, ZERO, ledger.target);
  await mr.waitForDeployment();

  // Registrar actually calls addMerchant so merchants[registrar] != NONE (left arm)
  const META = '0x' + '00'.repeat(32);
  await mr.connect(registrar).addMerchant(META);

    // Now call pinpoint helper from registrar to exercise the left-alreadyMerchant arm
    const leftBefore = await mr.TEST_if_alreadyMerchant_left(registrar.address);
    expect(leftBefore).to.equal(true);

    // Also call TEST_line118_already_or_force from registrar (msg param) to ensure coverage attributed
    const l2 = await mr.TEST_line118_already_or_force(registrar.address, false);
    expect(l2).to.equal(true);

    // Now using novault (no vault set) call the msg.sender vault-zero helper to exercise that arm
    const vZero = await mr.connect(novault).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(vZero).to.equal(true);

    // Finally exercise low-score branch by ensuring seer score < min for novault and calling helper
  const lowScore = await mr.TEST_if_seer_score_below_min_or_force(novault.address, false);
    expect(lowScore).to.equal(true);
  });
});
