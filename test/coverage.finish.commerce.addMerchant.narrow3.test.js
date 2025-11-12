const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.addMerchant.narrow3", function () {
  it("targets addMerchant lines ~118 and ~130 including msg.sender variants and force flags", async function () {
    const [deployer, alice, bob] = await ethers.getSigners();

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
    const MR = await ethers.getContractFactory("MerchantRegistry");
  const ZERO = '0x0000000000000000000000000000000000000000';
  const mr = await MR.deploy(deployer.address, erc.target, vault.target, seer.target, ZERO, ledger.target);
  await mr.waitForDeployment();

    // Prepare environment: give alice a vault and a passing score
    await vault.setVault(alice.address, bob.address);
    await seer.setMin(1);
    await seer.setScore(alice.address, 1);

    // --- Line ~118: alreadyMerchant OR force
    // initial: not forced, merchant status NONE -> expect false
    let out = await mr.TEST_line118_already_or_force(alice.address, false);
    expect(out).to.equal(false);

    // flip the TEST force and call again to hit the true arm
    await mr.TEST_setForceAlreadyMerchant(true);
    out = await mr.TEST_line118_already_or_force(alice.address, false);
    expect(out).to.equal(true);
    // restore
    await mr.TEST_setForceAlreadyMerchant(false);

    // --- Line ~130: msg.sender vaultZero OR force
    // call from alice (msg.sender variant). alice has a vault, so without force -> false
    let r = await mr.connect(alice).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(r).to.equal(false);

    // set TEST forceNoVault to true and call again from alice -> should return true
    await mr.TEST_setForceNoVault(true);
    r = await mr.connect(alice).TEST_line130_msgsender_vaultZero_or_force(false);
    expect(r).to.equal(true);
    await mr.TEST_setForceNoVault(false);

    // --- Exec msg.sender variants to assert computed accumulator value (no forces)
  const accBn = await mr.connect(alice).TEST_exec_addMerchant_msgsender_ifvariants(false, false, false);
  // returned as a JS BigInt (ethers v6) or BigNumber; normalize to Number for assertion
  const acc = Number(accBn);
    // Explanation:
    // alreadyMerchant: merchants[msg.sender].status == NONE => else branch adds 2
    // vaultOf(msg.sender) != address(0) => else branch adds 8
    // seer.getScore(msg.sender) >= minScore => else branch adds 32
    // total = 2 + 8 + 32 = 42
    expect(acc).to.equal(42);
  });
});
