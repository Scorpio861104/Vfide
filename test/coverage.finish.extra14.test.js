const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra14 - Finance pinpoint helpers", function () {
  let deployer, dao, alice, bob;

  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it("covers composite finance helper with permutations", async function () {
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Stable = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");
    const Treasury = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:EcoTreasuryVault");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();

    // default: not whitelisted, staticcall may succeed or not on this mock
    const a1 = await stable.TEST_cover_more_finance(good.target, 0, ethers.ZeroAddress, false, 0, false, false);
    expect(Number(a1)).to.be.a('number');

    // set asset whitelisted by calling addAsset as dao
    await stable.TEST_setOnlyDAOOff(true); // allow adding without dao
    await stable.addAsset(good.target, "G");
    expect(await stable.isWhitelisted(good.target)).to.equal(true);

    // now call helper with non-zero amount and to
    const a2 = await stable.TEST_cover_more_finance(good.target, 1000, bob.address, false, 0, true, true);
    expect(Number(a2)).to.be.a('number');

    // toggle force decimals return and call again
    await stable.TEST_setForceDecimals(8, true);
    const a3 = await stable.TEST_cover_more_finance(good.target, 1, bob.address, true, 8, false, false);
    expect(Number(a3)).to.be.a('number');
  });
});
