const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StablecoinRegistry and EcoTreasuryVault", function () {
  let owner, dao, other;
  let StablecoinRegistry, stable;
  let EcoTreasuryVault, treasury;
  let ERC20Mock, stableToken;

  beforeEach(async function () {
    [owner, dao, other] = await ethers.getSigners();

    StablecoinRegistry = await ethers.getContractFactory("StablecoinRegistry");
    stable = await StablecoinRegistry.deploy(dao.address, ethers.ZeroAddress);
    await stable.waitForDeployment();

    // Deploy a mock stablecoin
    ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    stableToken = await ERC20Mock.deploy("MockUSD", "MUSD");
    await stableToken.waitForDeployment();

    EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await EcoTreasuryVault.deploy(dao.address, ethers.ZeroAddress, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();
  });

  it("DAO can whitelist asset and treasury accepts deposits", async function () {
    // Initially not whitelisted
    expect(await stable.isWhitelisted(stableToken.target)).to.equal(false);

    // DAO adds asset
    await stable.connect(dao).addAsset(stableToken.target, "MUSD");
    expect(await stable.isWhitelisted(stableToken.target)).to.equal(true);

    // Mint tokens to other and approve treasury
    const amount = ethers.parseUnits("1000", 18);
    await stableToken.connect(other).mint(other.address, amount);
    await stableToken.connect(other).approve(treasury.target, amount);

    // Deposit stable into treasury
    await treasury.connect(other).depositStable(stableToken.target, amount);

    // treasury.balanceOf should reflect amount
    const bal = await treasury.balanceOf(stableToken.target);
    expect(bal).to.equal(amount);
  });

  it("non-DAO cannot add asset", async function () {
    await expect(stable.connect(other).addAsset(stableToken.target, "MUSD")).to.be.reverted;
  });
});
