const { expect } = require("chai");
const { ethers } = require("hardhat");

// helper to create a bytes32-like hex string
const mk32 = (n) => {
  const v = BigInt(n).toString(16);
  return '0x' + v.padStart(64, '0');
};

describe("VFIDECommerce coverage-focused tests", function () {
  let owner, dao, merchant, buyer, other;
  let ERC20Mock, token;
  let VaultHubMock, vaultHub;
  let SeerMock, seer;
  let MerchantRegistry, merchants;
  let CommerceEscrow, escrow;

  beforeEach(async function () {
    [owner, dao, merchant, buyer, other] = await ethers.getSigners();

    ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("MockTok", "MTK");
    await token.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    // set seer.min high so initial addMerchant fails due to low score
    await seer.connect(owner).setMin(100);
    merchants = await MerchantRegistry.deploy(owner.address, token.target, vaultHub.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await merchants.waitForDeployment();

    CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    escrow = await CommerceEscrow.deploy(owner.address, token.target, vaultHub.target, merchants.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();
  });

  it("addMerchant rejects when no vault or low score then succeeds when set", async function () {
    // default vaultHub returns address(0) -> COM_NotAllowed
  await expect(merchants.connect(merchant).addMerchant(mk32(1))).to.be.revertedWithCustomError(merchants, "COM_NotAllowed");

    // set vault and score
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await seer.connect(owner).setScore(merchant.address, 200);

  await expect(merchants.connect(merchant).addMerchant(mk32(2))).to.emit(merchants, "MerchantAdded");
    const info = await merchants.info(merchant.address);
    expect(info.status).to.equal(1); // ACTIVE
  });

  it("_noteRefund auto-suspends after threshold and _noteDispute similarly", async function () {
    // prepare merchant
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await seer.connect(owner).setScore(merchant.address, 200);
  await merchants.connect(merchant).addMerchant(mk32(3));

    // call _noteRefund autoSuspendRefunds times (default 5)
    for (let i = 0; i < 5; i++) {
      await merchants.connect(other)._noteRefund(merchant.address);
    }
    let info = await merchants.info(merchant.address);
    expect(info.status).to.equal(2); // SUSPENDED

    // reset: add a new merchant to test disputes
    const m2 = other;
    await vaultHub.connect(owner).setVault(m2.address, m2.address);
    await seer.connect(owner).setScore(m2.address, 200);
  await merchants.connect(m2).addMerchant(mk32(4));
    for (let i = 0; i < 3; i++) {
      await merchants.connect(other)._noteDispute(m2.address);
    }
    info = await merchants.info(m2.address);
    expect(info.status).to.equal(2); // SUSPENDED
  });

  it("escrow open/money flow: open, markFunded (insufficient), fund, release/refund/dispute/resolve paths", async function () {
    // prepare buyer and merchant vaults and merchant registration
    await vaultHub.connect(owner).setVault(buyer.address, buyer.address);
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await seer.connect(owner).setScore(merchant.address, 200);
  await merchants.connect(merchant).addMerchant(mk32(5));

    // open an escrow
    const amount = ethers.parseUnits("10", 18);
  const tx = await escrow.connect(buyer).open(merchant.address, amount, mk32(6));
    const receipt = await tx.wait();
    // id should be 1
    const id = 1;

    // markFunded should revert because contract has no balance
  await expect(escrow.connect(other).markFunded(id)).to.be.revertedWithCustomError(escrow, "COM_NotFunded");

    // fund the escrow: transfer tokens directly to escrow contract
    await token.connect(owner).mint(buyer.address, amount);
    await token.connect(buyer).transfer(escrow.target, amount);

    // now markFunded succeeds
    await escrow.connect(other).markFunded(id);

    // release by buyer should work
    await escrow.connect(buyer).release(id);
    // check seller vault received
    expect(await token.balanceOf(merchant.address)).to.equal(amount);

    // create another escrow to test refund/dispute/resolve
  const tx2 = await escrow.connect(buyer).open(merchant.address, amount, mk32(7));
    const id2 = 2;
    // fund second escrow
    await token.connect(buyer).mint(buyer.address, amount);
    await token.connect(buyer).transfer(escrow.target, amount);
    await escrow.connect(other).markFunded(id2);

    // refund by merchant
    await escrow.connect(merchant).refund(id2);
    expect((await escrow.escrows(id2)).state).to.equal(4); // REFUNDED

    // create third escrow and dispute/resolve
  const tx3 = await escrow.connect(buyer).open(merchant.address, amount, mk32(8));
    const id3 = 3;
    await token.connect(buyer).mint(buyer.address, amount);
    await token.connect(buyer).transfer(escrow.target, amount);
    await escrow.connect(other).markFunded(id3);
    // dispute by buyer
    await escrow.connect(buyer).dispute(id3, "reason");
    expect((await escrow.escrows(id3)).state).to.equal(5); // DISPUTED

    // resolve by DAO: buyerWins true -> funds returned to buyerVault
    await escrow.connect(owner).resolve(id3, true);
    expect((await escrow.escrows(id3)).state).to.equal(6); // RESOLVED
  });

  it("constructor reverts with zero addresses for MerchantRegistry and CommerceEscrow", async function () {
    const MerchantRegistryF = await ethers.getContractFactory("MerchantRegistry");
    await expect(MerchantRegistryF.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)).to.be.reverted;

    const CommerceEscrowF = await ethers.getContractFactory("CommerceEscrow");
    await expect(CommerceEscrowF.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)).to.be.reverted;
  });

  it("addMerchant rejects duplicate and _noteRefund/_noteDispute reject unknown merchant", async function () {
    // prepare vault and score
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await seer.connect(owner).setScore(merchant.address, 200);
    await merchants.connect(merchant).addMerchant(mk32(10));
    // duplicate add
    await expect(merchants.connect(merchant).addMerchant(mk32(11))).to.be.revertedWithCustomError(merchants, "COM_AlreadyMerchant");

    // _noteRefund/_noteDispute for unknown owner
    await expect(merchants.connect(other)._noteRefund(other.address)).to.be.revertedWithCustomError(merchants, "COM_NotMerchant");
    await expect(merchants.connect(other)._noteDispute(other.address)).to.be.revertedWithCustomError(merchants, "COM_NotMerchant");
  });

  it("open rejects zero amount, suspended merchant, and missing buyer vault", async function () {
    // zero amount
    await expect(escrow.connect(buyer).open(merchant.address, 0, mk32(12))).to.be.revertedWithCustomError(escrow, "COM_BadAmount");

    // suspended merchant -> create merchant then suspend
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await seer.connect(owner).setScore(merchant.address, 200);
    await merchants.connect(merchant).addMerchant(mk32(13));
    // suspend by refunds
    for (let i = 0; i < 5; i++) {
      await merchants.connect(other)._noteRefund(merchant.address);
    }
    // buyer vault not set here; set buyer vault for this test
    await vaultHub.connect(owner).setVault(buyer.address, buyer.address);
    await expect(escrow.connect(buyer).open(merchant.address, ethers.parseUnits("1", 18), mk32(14))).to.be.revertedWithCustomError(escrow, "COM_Suspended");

    // missing buyer vault -> new merchant
    const mA = other;
    await vaultHub.connect(owner).setVault(mA.address, mA.address);
    await seer.connect(owner).setScore(mA.address, 200);
    await merchants.connect(mA).addMerchant(mk32(15));
    // ensure buyer has no vault
    // remove buyer vault by deploying a fresh VaultHubMock is heavy; instead call open from a signer without vault
    // use a fresh signer that has no vault set (owner has none by default in beforeEach)
    await expect(escrow.connect(owner).open(mA.address, ethers.parseUnits("1", 18), mk32(16))).to.be.revertedWithCustomError(escrow, "COM_NotBuyer");
  });

  it("markFunded/release/refund/resolve negative paths (bad state, transfer failures, onlyDAO)", async function () {
    // bad state: markFunded on nonexistent id
    await expect(escrow.connect(other).markFunded(999)).to.be.revertedWithCustomError(escrow, "COM_BadState");

    // release before funded
    await vaultHub.connect(owner).setVault(buyer.address, buyer.address);
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await seer.connect(owner).setScore(merchant.address, 200);
    await merchants.connect(merchant).addMerchant(mk32(17));
    const amount = ethers.parseUnits("2", 18);
    await escrow.connect(buyer).open(merchant.address, amount, mk32(18));
    await expect(escrow.connect(buyer).release(1)).to.be.revertedWithCustomError(escrow, "COM_BadState");

    // transfer-failure scenarios using ERC20FailTransfer
    const FailFactory = await ethers.getContractFactory("ERC20FailTransfer");
    const failTok = await FailFactory.deploy();
    await failTok.waitForDeployment();

    const VaultHubF = await ethers.getContractFactory("VaultHubMock");
    const vaultF = await VaultHubF.deploy();
    await vaultF.waitForDeployment();
    const SeerF = await ethers.getContractFactory("SeerMock");
    const seerF = await SeerF.deploy();
    await seerF.waitForDeployment();

    const MerchF = await ethers.getContractFactory("MerchantRegistry");
    const merchantsF = await MerchF.deploy(owner.address, failTok.target, vaultF.target, seerF.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await merchantsF.waitForDeployment();
    const EscrowF = await ethers.getContractFactory("CommerceEscrow");
    const escrowF = await EscrowF.deploy(owner.address, failTok.target, vaultF.target, merchantsF.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrowF.waitForDeployment();

    // set vaults and seer score and merchant
    await vaultF.connect(owner).setVault(buyer.address, buyer.address);
    await vaultF.connect(owner).setVault(merchant.address, merchant.address);
    await seerF.connect(owner).setScore(merchant.address, 200);
    await merchantsF.connect(merchant).addMerchant(mk32(19));

    // open escrow and mint balance directly into escrow (so markFunded succeeds)
    await escrowF.connect(buyer).open(merchant.address, amount, mk32(20));
    const id = 1;
    // mint directly to escrow contract
    await failTok.connect(owner).mint(escrowF.target, amount);
    // now markFunded should succeed
    await escrowF.connect(other).markFunded(id);

    // release -> should fail because transfer returns false
    await expect(escrowF.connect(buyer).release(id)).to.be.revertedWith("transfer fail");

    // create second escrow to test refund transfer-fail
    await escrowF.connect(buyer).open(merchant.address, amount, mk32(21));
    const id2 = 2;
    await failTok.connect(owner).mint(escrowF.target, amount);
    await escrowF.connect(other).markFunded(id2);
    await expect(escrowF.connect(merchant).refund(id2)).to.be.revertedWith("transfer fail");

    // dispute/resolve negative flows
    await escrowF.connect(buyer).open(merchant.address, amount, mk32(22));
    const id3 = 3;
    await failTok.connect(owner).mint(escrowF.target, amount);
    await escrowF.connect(other).markFunded(id3);
    await escrowF.connect(buyer).dispute(id3, "x");

    // resolve by non-dao should revert with COM_NotDAO
    await expect(escrowF.connect(other).resolve(id3, true)).to.be.revertedWithCustomError(escrowF, "COM_NotDAO");

    // resolve by dao but buyerWins true should attempt transfer to buyer and fail (transfer returns false)
    await expect(escrowF.connect(owner).resolve(id3, true)).to.be.revertedWith("transfer fail");

    // create dispute and attempt resolve with buyerWins=false -> seller transfer fails
    await escrowF.connect(buyer).open(merchant.address, amount, mk32(23));
    const id4 = 4;
    await failTok.connect(owner).mint(escrowF.target, amount);
    await escrowF.connect(other).markFunded(id4);
    await escrowF.connect(buyer).dispute(id4, "y");
    await expect(escrowF.connect(owner).resolve(id4, false)).to.be.revertedWith("transfer fail");
  });
});
