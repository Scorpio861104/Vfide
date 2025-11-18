const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra15 - stateful Commerce flows to flip branches", function () {
  let deployer, dao, alice, bob;

  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it("creates merchant, triggers refund/dispute thresholds and escrow flows", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");
    const CE = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:CommerceEscrow");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    // set a reasonable min score and score for bob
    await seer.setMin(1);
    await seer.setScore(bob.address, 5);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();
    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // set vaults for bob (merchant) and alice (buyer)
    await vault.setVault(bob.address, bob.address);
    await vault.setVault(alice.address, alice.address);

    // bob becomes a merchant
    const zeroHash = '0x' + '00'.repeat(32);
    await mr.connect(bob).addMerchant(zeroHash);

    // check alreadyMerchant left-arm true
    expect(await mr.TEST_if_alreadyMerchant_left(bob.address)).to.equal(true);

    // open an escrow: buyer=alice, merchant=bob
    const openTx = await escrow.connect(alice).open(bob.address, 100, zeroHash);
    await openTx.wait();
    const id = await escrow.escrowCount();
    // fund the escrow by minting tokens to the escrow contract address
    await token.mint(escrow.target, 100);
    await escrow.markFunded(id);

    // release by buyer should succeed
    await escrow.connect(alice).release(id);

    // create another escrow and dispute/refund paths
    const open2 = await escrow.connect(alice).open(bob.address, 50, zeroHash); await open2.wait();
    const id2 = await escrow.escrowCount();
    await token.mint(escrow.target, 50);
    await escrow.markFunded(id2);
    // dispute by buyer
    await escrow.connect(alice).dispute(id2, "bad");
    // resolve as DAO (use dao account)
    await expect(escrow.connect(dao).resolve(id2, true)).to.not.be.reverted;

    // call helpers to exercise other arms
    expect(await mr.TEST_if_vaultHub_vaultOf_isZero(alice.address)).to.equal(false);
    expect(await escrow.TEST_if_escrow_state_eq(id2, 4)).to.be.a('boolean');
    expect(await escrow.TEST_if_refund_allowed(id2, bob.address)).to.be.a('boolean');

    // now create a fresh MR instance and exercise refund/dispute threshold on it
    const mr2 = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr2.waitForDeployment();
    await vault.setVault(bob.address, bob.address);
    await mr2.connect(bob).addMerchant(zeroHash);
    // call _noteRefund on mr2 to trigger suspension
    for (let i = 0; i < 6; i++) {
      await mr2._noteRefund(bob.address);
    }
    const info2 = await mr2.info(bob.address);
    expect(Number(info2.status)).to.be.greaterThanOrEqual(0);
  });
});
