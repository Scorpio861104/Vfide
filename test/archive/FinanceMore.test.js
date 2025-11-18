const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StablecoinRegistry and EcoTreasuryVault extra flows", function () {
  let owner, dao, recipient, other;
  let StablecoinRegistry, stable;
  let EcoTreasuryVault, treasury;
  let ERC20Mock, stableToken;
  let VFIDEToken, token, vestingVault;

  beforeEach(async function () {
    [owner, dao, recipient, other] = await ethers.getSigners();

    ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    stableToken = await ERC20Mock.deploy("MockUSD", "MUSD");
    await stableToken.waitForDeployment();

    StablecoinRegistry = await ethers.getContractFactory("StablecoinRegistry");
    stable = await StablecoinRegistry.deploy(dao.address, ethers.ZeroAddress);
    await stable.waitForDeployment();

    // VFIDE token for treasury
    const VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();
    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await EcoTreasuryVault.deploy(dao.address, ethers.ZeroAddress, stable.target, token.target);
    await treasury.waitForDeployment();
  });

  it("DAO can remove asset and set symbol hint", async function () {
    await stable.connect(dao).addAsset(stableToken.target, "MUSD");
    expect(await stable.isWhitelisted(stableToken.target)).to.equal(true);
    await stable.connect(dao).setSymbolHint(stableToken.target, "USDv1");
    expect(await stable.tokenDecimals(stableToken.target)).to.equal(18);
    await stable.connect(dao).removeAsset(stableToken.target);
    expect(await stable.isWhitelisted(stableToken.target)).to.equal(false);
  });

  it("treasury send works for whitelisted stable and VFIDE, and reverts for non-DAO", async function () {
    // whitelist stable and deposit some
    await stable.connect(dao).addAsset(stableToken.target, "MUSD");
    const amount = ethers.parseUnits("100", 18);
    await stableToken.connect(other).mint(other.address, amount);
    await stableToken.connect(other).approve(treasury.target, amount);
    await treasury.connect(other).depositStable(stableToken.target, amount);

    // DAO sends stable to recipient
    await treasury.connect(dao).send(stableToken.target, recipient.address, amount, "ops");
    expect(await stableToken.balanceOf(recipient.address)).to.equal(amount);

    // DAO sends VFIDE (treasury holds vfide via noteVFIDE -> but to simulate, transfer token into treasury)
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits("1000", 18));
    // transfer VFIDE to treasury
    await token.connect(owner).transfer(treasury.target, ethers.parseUnits("100",18));
    // now dao sends VFIDE from treasury to recipient
    await treasury.connect(dao).send(token.target, recipient.address, ethers.parseUnits("50",18), "vfide send");
    const rBal = await token.balanceOf(recipient.address);
    expect(rBal).to.equal(ethers.parseUnits("50",18));

    // non-DAO cannot call send
    await expect(treasury.connect(other).send(token.target, other.address, ethers.parseUnits("1",18), "x")).to.be.reverted;
  });
});
