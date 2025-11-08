const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken coverage-focused tests", function () {
  let owner, presaleSigner, alice, bob, charity;
  let VestingVault, vestingVault;
  let VFIDEToken, token;
  let VaultHubMock, vaultHub;
  let SecurityHubMock, securityHub;
  let BurnRouterMock, burnRouter;
  let LedgerMock, ledgerOk, ledgerRevert;

  beforeEach(async function () {
    [owner, presaleSigner, alice, bob, charity] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    securityHub = await SecurityHubMock.deploy();
    await securityHub.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    burnRouter = await BurnRouterMock.deploy();
    await burnRouter.waitForDeployment();

    LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledgerOk = await LedgerMock.deploy(false);
    await ledgerOk.waitForDeployment();
    ledgerRevert = await LedgerMock.deploy(true);
    await ledgerRevert.waitForDeployment();
  });

  it("owner admin paths: set modules and ledger", async function () {
    await expect(token.connect(owner).setVaultHub(vaultHub.target)).to.not.be.reverted;
    await expect(token.connect(owner).setSecurityHub(securityHub.target)).to.not.be.reverted;

    await token.connect(owner).setLedger(ledgerOk.target);
    expect(await token.ledger()).to.equal(ledgerOk.target);

    await token.connect(owner).setBurnRouter(burnRouter.target);
    expect(await token.ledger()).to.equal(ledgerOk.target);

    await token.connect(owner).setTreasurySink(charity.address);
    // set and read system exempt toggles
    await token.connect(owner).setSystemExempt(owner.address, true);
    expect(await token.systemExempt(owner.address)).to.equal(true);
    await token.connect(owner).setSystemExempt(owner.address, false);
    expect(await token.systemExempt(owner.address)).to.equal(false);
  });

  it("presale reverts and vault-only presale target enforcement", async function () {
    // not presale
    await expect(token.connect(alice).mintPresale(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, "VF_NOT_PRESALE");

    // set presale to presaleSigner
    await token.connect(owner).setVaultOnly(true);
    await token.connect(owner).setPresale(presaleSigner.address);

    // zero amount -> VF_ZERO
    await expect(token.connect(presaleSigner).mintPresale(alice.address, 0n)).to.be.revertedWithCustomError(token, "VF_ZERO");

    // vaultOnly true and vaultHub not set -> presale target !vault
    await expect(token.connect(presaleSigner).mintPresale(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("presale target !vault");
  });

  it("zero transfer emits Transfer(...,0) and approve zero reverts", async function () {
    await expect(token.connect(owner).transfer(bob.address, 0n)).to.emit(token, "Transfer").withArgs(owner.address, bob.address, 0n);

    await expect(token.connect(owner).approve(ethers.ZeroAddress, 1n)).to.be.revertedWith("approve 0");
  });

  it("security lock prevents transfer when vault is locked", async function () {
    // prepare vault: set vaultHub and mark owner as vault, set presale to owner and mint to owner
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.connect(owner).setVault(owner.address, owner.address);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).setVaultOnly(true);
    const amt = ethers.parseUnits("100", 18);
    await token.connect(owner).mintPresale(owner.address, amt);

    // attach security hub and lock the owner's vault
    await token.connect(owner).setSecurityHub(securityHub.target);
    await securityHub.connect(owner).setLocked(owner.address, true);

    await expect(token.connect(owner).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, "VF_LOCKED");
  });

  it("vaultOnly enforcement and insufficient balance revert", async function () {
    // make owner a vault and mint some tokens
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.connect(owner).setVault(owner.address, owner.address);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).setVaultOnly(true);
    const amt = ethers.parseUnits("50", 18);
    await token.connect(owner).mintPresale(owner.address, amt);

    // transferring to non-vault should revert with "to !vault"
    await expect(token.connect(owner).transfer(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("to !vault");

    // disable vaultOnly to test balance revert
    await token.connect(owner).setVaultOnly(false);
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("balance");
  });

  it("burn router branches: hard burn, soft burn and sanctum routing", async function () {
    // prepare vault & mint to owner
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.connect(owner).setVault(owner.address, owner.address);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).setVaultOnly(true);
    const amt = ethers.parseUnits("1000", 18);
    await token.connect(owner).mintPresale(owner.address, amt);

    // set treasury sink
    await token.connect(owner).setTreasurySink(charity.address);

  // set burn router to hard burn + sanctum amount routing to treasury
  await token.connect(owner).setBurnRouter(burnRouter.target);
  await burnRouter.connect(owner).set(ethers.parseUnits("10", 18), ethers.parseUnits("5", 18), ethers.ZeroAddress, ethers.ZeroAddress);

  // presale set earlier marks presale as systemExempt; disable exemption so fees apply
  await token.connect(owner).setSystemExempt(owner.address, false);

  const totalBefore = await token.totalSupply();
    // make a transfer from owner to a vault recipient; create recipient vault
    await vaultHub.connect(owner).setVault(bob.address, bob.address);
    // ensure recipient is vault by disabling systemExempt
    const tx = await token.connect(owner).transfer(bob.address, ethers.parseUnits("100", 18));
    await expect(tx).to.emit(token, "FeeApplied");
    const totalAfter = await token.totalSupply();
    expect(totalAfter).to.equal(totalBefore - ethers.parseUnits("10", 18));

    // soft burn path: set burnSink to a soft sink
    const sink = alice.address;
    await burnRouter.connect(owner).set(ethers.parseUnits("1", 18), 0n, ethers.ZeroAddress, sink);
    await token.connect(owner).transfer(bob.address, ethers.parseUnits("10", 18));
    const sinkBal = await token.balanceOf(sink);
    expect(sinkBal).to.be.greaterThan(0n);

    // sanctumAmt routing to explicit sanctumSink
    await burnRouter.connect(owner).set(0n, ethers.parseUnits("2", 18), bob.address, ethers.ZeroAddress);
    // ensure bob is vault
    await token.connect(owner).transfer(bob.address, ethers.parseUnits("10", 18));
    const bobBal = await token.balanceOf(bob.address);
    expect(bobBal).to.be.greaterThan(0n);
  });

  it("policyLocked prevents removing router and ledger try/catch paths", async function () {
    // set router and ledger
    await token.connect(owner).setBurnRouter(burnRouter.target);
    await token.connect(owner).setLedger(ledgerOk.target);

    // lock policy
    await token.connect(owner).lockPolicy();

    // attempt to set burn router to zero should revert
    await expect(token.connect(owner).setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, "VF_POLICY_LOCKED");

    // ledger try/catch: set ledger that reverts and call an operation that logs
    await token.connect(owner).setLedger(ledgerRevert.target);
    // calling setVaultHub triggers _log which will call ledger.logSystemEvent in try/catch
    await expect(token.connect(owner).setVaultHub(vaultHub.target)).to.not.be.reverted;
  });

  it("owner transferOwnership, decreaseAllowance underflow, presale mint to zero and router-required transfer", async function () {
  // transfer ownership to presaleSigner and back
  await token.connect(owner).transferOwnership(presaleSigner.address);
  expect(await token.owner()).to.equal(presaleSigner.address);

  // switch back to owner for further admin ops by setting owner back
  await token.connect(presaleSigner).transferOwnership(owner.address);

    // decreaseAllowance underflow
    await token.connect(owner).approve(alice.address, 1n);
    await expect(token.connect(owner).decreaseAllowance(alice.address, 2n)).to.be.revertedWith("allow underflow");

    // presale mint to zero address should revert via _mint VF_ZERO
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    await expect(token.connect(owner).mintPresale(ethers.ZeroAddress, 1n)).to.be.revertedWithCustomError(token, "VF_ZERO");

    // policy locked with no router should make transfers fail with router required
    // give owner a small balance
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("10", 18));
    await token.connect(owner).lockPolicy();
    // ensure burnRouter is zero
    await expect(token.connect(owner).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("router required");
  });

  it("constructor edge reverts and approve success", async function () {
    // constructor should revert when devReserveVestingVault is zero
    const VFIDETokenFactory = await ethers.getContractFactory("VFIDEToken");
    await expect(VFIDETokenFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWithCustomError(VFIDETokenFactory, "VF_ZERO");

    // constructor should revert when devReserveVestingVault is an EOA (not a contract)
    const signers = await ethers.getSigners();
    const eoa = signers[2];
    await expect(VFIDETokenFactory.deploy(eoa.address, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWith("devVault !contract");

    // approve success path to cover return true
    await expect(token.connect(owner).approve(alice.address, 123n)).to.not.be.reverted;
    expect(await token.allowance(owner.address, alice.address)).to.equal(123n);
  });

  it("constructor with optional modules set and callStatic approve return", async function () {
    // Deploy a token with vaultHub, ledger and treasurySink set in the constructor to hit those branches
    const VFIDETokenFactory = await ethers.getContractFactory("VFIDEToken");
    const t2 = await VFIDETokenFactory.deploy(vestingVault.target, vaultHub.target, ledgerOk.target, charity.address);
    await t2.waitForDeployment();
    expect(await t2.vaultHub()).to.equal(vaultHub.target);
    expect(await t2.ledger()).to.equal(ledgerOk.target);
    expect(await t2.treasurySink()).to.equal(charity.address);

    // approve transaction and verify allowance (covers approve return path)
    await t2.approve(alice.address, 5n);
    expect(await t2.allowance(owner.address, alice.address)).to.equal(5n);
  });

  it("allowance and transferFrom happy paths", async function () {
    // give owner some balance via presale mint
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("100", 18));

    // approve and transferFrom
    await token.connect(owner).approve(presaleSigner.address, ethers.parseUnits("10", 18));
    await token.connect(presaleSigner).transferFrom(owner.address, bob.address, ethers.parseUnits("10", 18));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("10", 18));

    // decreaseAllowance happy path
    await token.connect(owner).approve(alice.address, 20n);
    await token.connect(owner).decreaseAllowance(alice.address, 5n);
    expect(await token.allowance(owner.address, alice.address)).to.equal(15n);
  });

  it("callStatic approve returns true and securityHub unlocked path", async function () {
  // call the approve as a static call via provider and decode the return value
  const data = token.interface.encodeFunctionData("approve", [alice.address, 1n]);
  const res = await ethers.provider.call({ to: token.target, data });
  const [ok] = token.interface.decodeFunctionResult("approve", res);
  expect(ok).to.equal(true);

    // ensure securityHub unlocked (default false) allows transfers when set
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.connect(owner).setVault(owner.address, owner.address);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("10", 18));

    // attach security hub (defaults to unlocked)
    await token.connect(owner).setSecurityHub(securityHub.target);

    // make recipient a vault and transfer should succeed when lock is false
    await vaultHub.connect(owner).setVault(bob.address, bob.address);
    await expect(token.connect(owner).transfer(bob.address, ethers.parseUnits("1", 18))).to.not.be.reverted;
  });

  it("_isVault false path and presale target mismatch", async function () {
    // set vaultHub so vaultOf returns a different non-zero address
    await token.connect(owner).setVaultHub(vaultHub.target);
    // map alice -> owner (v != alice)
    await vaultHub.connect(owner).setVault(alice.address, owner.address);

    // set presale to presaleSigner and attempt mint to alice, should revert with presale target !vault
    await token.connect(owner).setPresale(presaleSigner.address);
    await expect(token.connect(presaleSigner).mintPresale(alice.address, ethers.parseUnits("1", 18))).to.be.revertedWith("presale target !vault");
  });

  it("_vaultOfAddr returns address(0) when vaultHub unset (securityHub present) and transfer proceeds when exempt", async function () {
    // give owner some balance by disabling vaultOnly and setting presale
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("5", 18));

    // make owner and bob system exempt so vaultOnly checks are bypassed
    await token.connect(owner).setSystemExempt(owner.address, true);
    await token.connect(owner).setSystemExempt(bob.address, true);

    // set securityHub but leave vaultHub unset; this will call _vaultOfAddr which should return address(0)
    await token.connect(owner).setSecurityHub(securityHub.target);

    // transfer should succeed (no locks and exempted from vault-only checks)
    await expect(token.connect(owner).transfer(bob.address, ethers.parseUnits("1", 18))).to.not.be.reverted;
  });

  it("_locked branch where staticcall fails (ok=false) causes VF_LOCKED", async function () {
    // set vaultHub and mark owner as vault
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.connect(owner).setVault(owner.address, owner.address);

    // give owner balance
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("3", 18));

    // set securityHub to an EOA address (staticcall to an EOA will fail -> ok=false)
    const signers = await ethers.getSigners();
    const eoa = signers[3];
    await token.connect(owner).setSecurityHub(eoa.address);

    // attempt transfer should revert due to VF_LOCKED because _locked returns true when staticcall fails
    await expect(token.connect(owner).transfer(bob.address, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(token, "VF_LOCKED");
  });
});
