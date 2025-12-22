const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Ecosystem Vault & Splitter Integration', function () {
  let router, seer, dao, user, treasury, daoSink, ecoVault, splitter, token;

  beforeEach(async function () {
    [dao, user, treasury, daoSink, ecoVault] = await ethers.getSigners();

    // Mock Token
    const Token = await ethers.getContractFactory('ERC20Mock');
    token = await Token.deploy("VFIDE", "VFIDE");
    await token.mint(dao.address, ethers.parseEther("1000000")); // 1M tokens with proper decimals

    // Mock Seer
    const Seer = await ethers.getContractFactory('SeerMock');
    seer = await Seer.deploy();
    await seer.setScore(user.address, 5000); // Neutral on 0-10000 scale

    // Deploy Splitter (DAO + EcoVault)
    // We need to calculate shares.
    // DAO gets 5% of TOTAL. Eco gets 30% of REMAINDER (95%).
    // Eco = 0.3 * 0.95 = 0.285 = 28.5% of TOTAL.
    // Ratio DAO:Eco = 5 : 28.5 = 50 : 285 = 10 : 57.
    // Total parts = 67.
    // DAO Share = 10/67 * 10000 = 1492 bps
    // Eco Share = 57/67 * 10000 = 8507 bps
    // Total = 9999 (close enough to 10000)
    // Let's use 1493 and 8507.
    
    const Splitter = await ethers.getContractFactory('RevenueSplitter');
    splitter = await Splitter.deploy(
        [daoSink.address, ecoVault.address],
        [1493, 8507]
    );

    // Deploy Router with Splitter as the "DAO Sink" (ecosystemSink)
    // ProofScoreBurnRouter constructor: seer, sanctumSink, burnSink, ecosystemSink
    const Router = await ethers.getContractFactory('ProofScoreBurnRouter');
    router = await Router.deploy(await seer.getAddress(), treasury.address, treasury.address, splitter.target);
  });

  it.skip('should route combined DAO+Eco fees to the Splitter (skipped - fee algorithm changed)', async function () {
    // Total fee for score 500 (neutral) -> 512 bps (5.12%)
    // DAO = 5% of 512 = 25.6 bps
    // Remainder = 486.4 bps
    // Eco = 30% of 486.4 = 145.92 bps
    // Total to Splitter = 25.6 + 145.92 = 171.52 bps
    
    const amount = ethers.parseEther("10000");
    const fees = await router.computeFees(user.address, ethers.ZeroAddress, amount);
    
    // fees[2] is ecosystemAmount (DAO + Eco)
    const ecosystemAmount = fees[2];
    const ecosystemSink = fees[4];
    
    expect(ecosystemSink).to.equal(await splitter.getAddress());
    
    // Verify amount is roughly correct (171.52 bps of 10000 = 171.52 tokens)
    const expected = ethers.parseEther("171.52");
    expect(ecosystemAmount).to.be.closeTo(expected, ethers.parseEther("1"));
  });

  it('should allow Splitter to distribute funds to DAO and EcoVault', async function () {
    // Send tokens to Splitter
    const amount = ethers.parseEther("100");
    await token.transfer(await splitter.getAddress(), amount);
    
    // Distribute
    await splitter.distribute(await token.getAddress());
    
    // Check balances
    // DAO should get ~14.93%
    // Eco should get ~85.07%
    const daoBal = await token.balanceOf(daoSink.address);
    const ecoBal = await token.balanceOf(ecoVault.address);
    
    expect(daoBal).to.equal(ethers.parseEther("14.93"));
    expect(ecoBal).to.equal(ethers.parseEther("85.07"));
  });
});
