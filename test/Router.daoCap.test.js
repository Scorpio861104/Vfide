const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ProofScoreBurnRouterPlus DAO Cap', function () {
  let router, seer, dao, user, treasury, daoSink;

  beforeEach(async function () {
    [dao, user, treasury, daoSink] = await ethers.getSigners();

    // Mock Seer
    const Seer = await ethers.getContractFactory('SeerMock');
    seer = await Seer.deploy();
    await seer.setScore(user.address, 500); // Neutral

    // Deploy Router
    const Router = await ethers.getContractFactory('ProofScoreBurnRouterPlus');
    router = await Router.deploy(dao.address, await seer.getAddress(), treasury.address, daoSink.address);
  });

  it('should allocate exactly 5% of total fee to DAO sink', async function () {
    // Total fee for score 500 (neutral)
    // min=25, max=1000. range=975. inverse=500.
    // total = 25 + (975 * 500 / 1000) = 25 + 487 = 512 bps (5.12%)
    
    const amount = ethers.parseEther("1000");
    const fees = await router.computeFees(user.address, ethers.ZeroAddress, amount);
    
    // fees: [burn, sanctum, eco, sanctumSink, ecoSink, burnSink]
    const burnAmt = fees[0];
    const sanctumAmt = fees[1];
    const daoAmt = fees[2];
    
    const totalFee = burnAmt + sanctumAmt + daoAmt;
    
    // Check DAO share is ~5% of total fee
    // Allow small rounding error
    const expectedDao = totalFee * 5n / 100n;
    expect(daoAmt).to.be.closeTo(expectedDao, ethers.parseEther("0.0001"));
    
    // Check remaining split 50/50
    const remaining = totalFee - daoAmt;
    expect(burnAmt).to.be.closeTo(remaining / 2n, ethers.parseEther("0.0001"));
    expect(sanctumAmt).to.be.closeTo(remaining / 2n, ethers.parseEther("0.0001"));
  });

  it('should route DAO fees to the correct sink', async function () {
    const fees = await router.computeFees(user.address, ethers.ZeroAddress, 1000);
    expect(fees[4]).to.equal(daoSink.address); // ecosystemSink
  });
});
