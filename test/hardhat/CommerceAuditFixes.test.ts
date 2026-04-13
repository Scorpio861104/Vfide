import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("CardBoundVault (Fix 2)", () => {
  it("allows admin to approve VFIDE spender", async () => {
    const { ethers } = (await network.connect()) as any;
    const [hub, admin, wallet, guardian, spender] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const vault = await Vault.deploy(
      hub.address,
      await token.getAddress(),
      admin.address,
      wallet.address,
      [guardian.address],
      1,
      ethers.parseEther("100"),
      ethers.parseEther("300"),
      ethers.ZeroAddress,
    );
    await vault.waitForDeployment();

    const amount = ethers.parseEther("42");
    await vault.connect(admin).approveVFIDE(spender.address, amount);

    const allowance = await token.allowance(await vault.getAddress(), spender.address);
    assert.equal(allowance, amount);
  });
});

describe("MerchantPortal (Fixes 3 and 5)", () => {
  async function deployPortalFixture() {
    const { ethers } = (await network.connect()) as any;
    const [dao, customer, merchant, feeSink] = await ethers.getSigners();

    const VaultHubStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const vaultHub = await VaultHubStub.deploy();
    await vaultHub.waitForDeployment();

    const SeerStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(customer.address, 5000);
    await seer.setScore(merchant.address, 7000);

    const SecurityHub = await ethers.getContractFactory("test/contracts/mocks/SecurityHubMock.sol:SecurityHubMock");
    const securityHub = await SecurityHub.deploy();
    await securityHub.waitForDeployment();

    const Portal = await ethers.getContractFactory("MerchantPortal");
    const portal = await Portal.deploy(
      dao.address,
      await vaultHub.getAddress(),
      await seer.getAddress(),
      await securityHub.getAddress(),
      feeSink.address,
    );
    await portal.waitForDeployment();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
    await portal.connect(dao).setProtocolFee(100); // 1%

    await vaultHub.setVault(customer.address, customer.address);
    await vaultHub.setVault(merchant.address, merchant.address);

    await portal.connect(merchant).registerMerchant("Shop", "retail");

    return { ethers, portal, token, seer, customer, merchant, dao };
  }

  it("rewards merchant and customer on successful pay", async () => {
    const { ethers, portal, token, seer, customer, merchant } = await deployPortalFixture();

    const amount = ethers.parseEther("10");
    await token.mint(customer.address, amount);
    await token.connect(customer).approve(await portal.getAddress(), amount);

    await portal.connect(customer).pay(merchant.address, await token.getAddress(), amount, "order-1");

    assert.equal(await seer.scores(merchant.address), 7003n);
    assert.equal(await seer.scores(customer.address), 5001n);
  });

  it("calculates gross checkout total from desired item amount", async () => {
    const { ethers, portal, token, customer, merchant } = await deployPortalFixture();

    const itemAmount = ethers.parseEther("10");
    const preview = await portal.previewCheckout(customer.address, merchant.address, await token.getAddress(), itemAmount);

    const grossAmount = preview[0];
    const totalFee = preview[1];
    const protocolFee = preview[2];
    const networkFee = preview[3];

    assert.equal(networkFee, 0n);
    assert.equal(totalFee, protocolFee);
    const netAfterFees = grossAmount - totalFee;
    assert.ok(netAfterFees <= itemAmount);
    assert.ok(itemAmount - netAfterFees <= 1_000_000n);
    assert.ok(grossAmount > itemAmount);
  });
});
