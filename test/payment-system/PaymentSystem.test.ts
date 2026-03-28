import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

describe("FeeDistributor (5-channel)", function () {
  let distributor: any;
  let token: any;
  let admin: SignerWithAddress;
  let burn: SignerWithAddress;
  let sanctum: SignerWithAddress;
  let dao: SignerWithAddress;
  let merchants: SignerWithAddress;
  let headhunters: SignerWithAddress;

  const FEE = ethers.utils.parseEther("10000");

  async function deployFixture() {
    [admin, burn, sanctum, dao, merchants, headhunters] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("200000000"));
    const F = await ethers.getContractFactory("FeeDistributor");
    distributor = await F.deploy(token.address, burn.address, sanctum.address, dao.address, merchants.address, headhunters.address, admin.address);
    await distributor.deployed();
    await token.transfer(distributor.address, FEE);
    await distributor.receiveFee(FEE);
    return { distributor, token, admin, burn, sanctum, dao, merchants, headhunters };
  }

  beforeEach(async function () {
    ({ distributor, token, admin, burn, sanctum, dao, merchants, headhunters } = await loadFixture(deployFixture));
  });

  it("should split 35/20/15/20/10 by default", async function () {
    await distributor.distribute();
    const bBal = await token.balanceOf(burn.address);
    const sBal = await token.balanceOf(sanctum.address);
    const dBal = await token.balanceOf(dao.address);
    const mBal = await token.balanceOf(merchants.address);
    const hBal = await token.balanceOf(headhunters.address);
    expect(bBal).to.equal(FEE.mul(3500).div(10000));
    expect(sBal).to.equal(FEE.mul(2000).div(10000));
    expect(dBal).to.equal(FEE.mul(1500).div(10000));
    expect(mBal).to.equal(FEE.mul(2000).div(10000));
    // Headhunters get remainder (handles rounding)
    expect(hBal).to.equal(FEE.sub(bBal).sub(sBal).sub(dBal).sub(mBal));
  });

  it("should leave zero balance after distribution", async function () {
    await distributor.distribute();
    expect(await token.balanceOf(distributor.address)).to.equal(0);
  });

  it("should revert below minimum", async function () {
    const F = await ethers.getContractFactory("FeeDistributor");
    const empty = await F.deploy(token.address, burn.address, sanctum.address, dao.address, merchants.address, headhunters.address, admin.address);
    await token.transfer(empty.address, ethers.utils.parseEther("1"));
    await expect(empty.distribute()).to.be.revertedWithCustomError(empty, "BelowMinimum");
  });

  it("should enforce 72hr timelock on split changes", async function () {
    await distributor.connect(admin).proposeSplitChange(3000, 2000, 2000, 2000, 1000);
    await expect(distributor.connect(admin).executeSplitChange()).to.be.revertedWithCustomError(distributor, "SplitChangeNotReady");
    await time.increase(72 * 3600 + 1);
    await distributor.connect(admin).executeSplitChange();
    const split = await distributor.getCurrentSplit();
    expect(split[0]).to.equal(3000);
  });

  it("should reject burn below 20%", async function () {
    await expect(
      distributor.connect(admin).proposeSplitChange(1999, 2000, 2000, 2001, 2000)
    ).to.be.revertedWithCustomError(distributor, "BurnTooLow");
  });

  it("should reject split not summing to 10000", async function () {
    await expect(
      distributor.connect(admin).proposeSplitChange(3000, 2000, 2000, 2000, 999)
    ).to.be.revertedWithCustomError(distributor, "InvalidSplit");
  });
});


describe("DAOPayrollPool (12 max, percentage-based)", function () {
  let pool: any;
  let token: any;
  let admin: SignerWithAddress;
  let seer: SignerWithAddress;
  let m1: SignerWithAddress;
  let m2: SignerWithAddress;
  let m3: SignerWithAddress;
  let inactive: SignerWithAddress;
  let feeSource: SignerWithAddress;

  const SEED = ethers.utils.parseEther("90000");
  const MAX_PAYOUT = ethers.utils.parseEther("500000");

  async function deployFixture() {
    [admin, seer, m1, m2, m3, inactive, feeSource] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("200000000"));
    const F = await ethers.getContractFactory("DAOPayrollPool");
    pool = await F.deploy(token.address, admin.address, MAX_PAYOUT);
    await pool.deployed();
    await pool.connect(admin).grantRecorder(seer.address);
    await token.transfer(feeSource.address, ethers.utils.parseEther("5000000"));
    await token.connect(feeSource).approve(pool.address, ethers.constants.MaxUint256);
    await pool.connect(feeSource).receiveFunding(SEED);
    return { pool, token, admin, seer, m1, m2, m3, inactive, feeSource };
  }

  beforeEach(async function () {
    ({ pool, token, admin, seer, m1, m2, m3, inactive, feeSource } = await loadFixture(deployFixture));
  });

  it("should cap at 12 participants", async function () {
    expect(await pool.maxParticipants()).to.equal(12);
  });

  it("should record votes and weight by score", async function () {
    await pool.connect(seer).recordVote(m1.address);    // 1 pt
    await pool.connect(seer).recordReview(m1.address);   // 2 pts
    await pool.connect(seer).recordVote(m2.address);     // 1 pt
    expect(await pool.scores(1, m1.address)).to.equal(3);
    expect(await pool.scores(1, m2.address)).to.equal(1);
    expect(await pool.totalScores(1)).to.equal(4);
  });

  it("should split proportionally — more work = bigger share", async function () {
    // m1: 10 points (5 votes + 2 reviews + 1 discussion)
    for (let i = 0; i < 5; i++) await pool.connect(seer).recordVote(m1.address);
    await pool.connect(seer).recordReview(m1.address);
    await pool.connect(seer).recordReview(m1.address);
    await pool.connect(seer).recordDiscussion(m1.address);

    // m2: 2 points (2 votes)
    await pool.connect(seer).recordVote(m2.address);
    await pool.connect(seer).recordVote(m2.address);

    // m3: 1 point (1 vote)
    await pool.connect(seer).recordVote(m3.address);

    // Total: 13 points. Pool: 90K VFIDE
    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(seer).recordVote(m1.address); // trigger new period

    await pool.finalizePeriod(1);

    await pool.connect(m1).claimPayment(1);
    await pool.connect(m2).claimPayment(1);
    await pool.connect(m3).claimPayment(1);

    const pay1 = await pool.totalEarnedByWorker(m1.address);
    const pay2 = await pool.totalEarnedByWorker(m2.address);
    const pay3 = await pool.totalEarnedByWorker(m3.address);

    // m1 should get 10/13 of pool, m2 gets 2/13, m3 gets 1/13
    expect(pay1).to.be.gt(pay2);
    expect(pay2).to.be.gt(pay3);
    // Approximate checks (integer division truncation)
    expect(pay1).to.equal(SEED.mul(10).div(13));
    expect(pay2).to.equal(SEED.mul(2).div(13));
    expect(pay3).to.equal(SEED.mul(1).div(13));
  });

  it("should give inactive members zero (Howey-safe)", async function () {
    await pool.connect(seer).recordVote(m1.address);
    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(seer).recordVote(m1.address);
    await pool.finalizePeriod(1);

    await expect(
      pool.connect(inactive).claimPayment(1)
    ).to.be.revertedWithCustomError(pool, "NoContribution");
  });

  it("should reject claim before finalization", async function () {
    await pool.connect(seer).recordVote(m1.address);
    await expect(pool.connect(m1).claimPayment(1)).to.be.revertedWithCustomError(pool, "PeriodNotFinalized");
  });

  it("should reject double claim", async function () {
    await pool.connect(seer).recordVote(m1.address);
    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(seer).recordVote(m1.address);
    await pool.finalizePeriod(1);
    await pool.connect(m1).claimPayment(1);
    await expect(pool.connect(m1).claimPayment(1)).to.be.revertedWithCustomError(pool, "AlreadyClaimed");
  });

  it("should carry balance forward when no one worked", async function () {
    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(seer).recordVote(m1.address);
    await pool.finalizePeriod(1);
    expect(await pool.periodPool(1)).to.equal(0);
    // Balance still in contract
    expect(await token.balanceOf(pool.address)).to.equal(SEED);
  });

  it("should NOT double-count balance across consecutive periods (critical fix)", async function () {
    // Period 1: m1 participates
    await pool.connect(seer).recordVote(m1.address);
    await time.increase(THIRTY_DAYS + 1);

    // Period 2: m2 participates — fee revenue arrives
    await pool.connect(seer).recordVote(m2.address);
    await pool.connect(feeSource).receiveFunding(ethers.utils.parseEther("50000"));
    await time.increase(THIRTY_DAYS + 1);

    // Period 3: trigger advance
    await pool.connect(seer).recordVote(m1.address);

    // Finalize period 1: should get SEED (90K), not SEED+50K
    await pool.finalizePeriod(1);
    const pool1 = await pool.periodPool(1);
    expect(pool1).to.equal(SEED); // 90K committed

    // Finalize period 2: should get only the 50K that arrived, NOT re-count the 90K
    await pool.finalizePeriod(2);
    const pool2 = await pool.periodPool(2);
    expect(pool2).to.equal(ethers.utils.parseEther("50000")); // Only 50K available

    // Both can claim without reverting
    await pool.connect(m1).claimPayment(1);
    await pool.connect(m2).claimPayment(2);

    // Verify totals
    expect(await pool.totalEarnedByWorker(m1.address)).to.equal(SEED);
    expect(await pool.totalEarnedByWorker(m2.address)).to.equal(ethers.utils.parseEther("50000"));
  });

  it("should handle Howey equality — token holdings don't affect payment", async function () {
    // Give m1 a million tokens (whale), m2 has nothing
    await token.transfer(m1.address, ethers.utils.parseEther("1000000"));

    // Both do 1 vote (same work)
    await pool.connect(seer).recordVote(m1.address);
    await pool.connect(seer).recordVote(m2.address);

    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(seer).recordVote(m1.address);
    await pool.finalizePeriod(1);

    await pool.connect(m1).claimPayment(1);
    await pool.connect(m2).claimPayment(1);

    // Equal work = equal pay, regardless of holdings
    expect(await pool.totalEarnedByWorker(m1.address))
      .to.equal(await pool.totalEarnedByWorker(m2.address));
  });
});


describe("MerchantCompetitionPool (volume-weighted)", function () {
  let pool: any;
  let token: any;
  let admin: SignerWithAddress;
  let recorder: SignerWithAddress;
  let merchantA: SignerWithAddress;
  let merchantB: SignerWithAddress;
  let feeSource: SignerWithAddress;

  const SEED = ethers.utils.parseEther("200000");
  const MAX_PAYOUT = ethers.utils.parseEther("1000000");
  const MIN_TX = 10 * 1e6; // $10 minimum

  async function deployFixture() {
    [admin, recorder, merchantA, merchantB, , feeSource] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("200000000"));
    const F = await ethers.getContractFactory("MerchantCompetitionPool");
    pool = await F.deploy(token.address, admin.address, MAX_PAYOUT, MIN_TX);
    await pool.deployed();
    await pool.connect(admin).grantRecorder(recorder.address);
    await token.transfer(feeSource.address, ethers.utils.parseEther("5000000"));
    await token.connect(feeSource).approve(pool.address, ethers.constants.MaxUint256);
    await pool.connect(feeSource).receiveFunding(SEED);
    return { pool, token, admin, recorder, merchantA, merchantB, feeSource };
  }

  beforeEach(async function () {
    ({ pool, token, admin, recorder, merchantA, merchantB, feeSource } = await loadFixture(deployFixture));
  });

  it("should score merchants by volume", async function () {
    // Merchant A: $50,000 in transactions
    await pool.connect(recorder).recordTransaction(merchantA.address, 50000 * 1e6);
    // Merchant B: $150,000
    await pool.connect(recorder).recordTransaction(merchantB.address, 150000 * 1e6);

    expect(await pool.scores(1, merchantA.address)).to.equal(50000); // $50K = 50000 pts
    expect(await pool.scores(1, merchantB.address)).to.equal(150000);
    expect(await pool.totalScores(1)).to.equal(200000);
  });

  it("should split pool proportional to volume", async function () {
    await pool.connect(recorder).recordTransaction(merchantA.address, 50000 * 1e6);
    await pool.connect(recorder).recordTransaction(merchantB.address, 150000 * 1e6);

    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(recorder).recordTransaction(merchantA.address, 10 * 1e6);
    await pool.finalizePeriod(1);

    await pool.connect(merchantA).claimPayment(1);
    await pool.connect(merchantB).claimPayment(1);

    const payA = await pool.totalEarnedByWorker(merchantA.address);
    const payB = await pool.totalEarnedByWorker(merchantB.address);

    // A: 50K/200K = 25% of pool, B: 150K/200K = 75%
    expect(payA).to.equal(SEED.mul(50000).div(200000));
    expect(payB).to.equal(SEED.mul(150000).div(200000));
    expect(payB).to.equal(payA.mul(3)); // B did 3x volume → 3x pay
  });

  it("should reject transactions below minimum size", async function () {
    await expect(
      pool.connect(recorder).recordTransaction(merchantA.address, 5 * 1e6)
    ).to.be.revertedWith("Below minimum transaction size");
  });

  it("should track volume per period", async function () {
    await pool.connect(recorder).recordTransaction(merchantA.address, 100000 * 1e6);
    expect(await pool.getMerchantVolume(1, merchantA.address)).to.equal(100000 * 1e6);
    expect(await pool.periodTotalVolume(1)).to.equal(100000 * 1e6);
  });

  it("should roll over funds when nobody participates", async function () {
    // Period 1: no merchants participate
    await time.increase(THIRTY_DAYS + 1);
    // Need to trigger period advance — use a tiny tx from a throwaway
    await pool.connect(recorder).recordTransaction(merchantA.address, MIN_TX);
    // Now finalize period 1 (no one participated in period 1)
    // Actually merchantA had no activity in period 1 since we only advanced after
    // Let me redo: start fresh, skip period 1 entirely

    // Re-approach: deploy fresh, let period 1 pass with no activity
    const F2 = await ethers.getContractFactory("MerchantCompetitionPool");
    const fresh = await F2.deploy(token.address, admin.address, MAX_PAYOUT, MIN_TX);
    await fresh.deployed();
    await fresh.connect(admin).grantRecorder(recorder.address);

    // Month 1: FeeDistributor sends 100K, nobody works
    await token.connect(feeSource).approve(fresh.address, ethers.constants.MaxUint256);
    await fresh.connect(feeSource).receiveFunding(ethers.utils.parseEther("100000"));
    await time.increase(THIRTY_DAYS + 1);

    // Month 2: another 100K arrives, still nobody
    await fresh.connect(feeSource).receiveFunding(ethers.utils.parseEther("100000"));
    // Trigger period advance
    await fresh.connect(recorder).recordTransaction(merchantA.address, 50000 * 1e6);
    // Finalize period 1 (empty)
    await fresh.finalizePeriod(1);
    expect(await fresh.periodPool(1)).to.equal(0); // Nothing distributed
    // Balance should be 200K (100K + 100K) minus nothing claimed
    expect(await token.balanceOf(fresh.address)).to.equal(ethers.utils.parseEther("200000"));

    await time.increase(THIRTY_DAYS + 1);

    // Month 3: another 100K arrives, one merchant finally shows up
    await fresh.connect(feeSource).receiveFunding(ethers.utils.parseEther("100000"));
    await fresh.connect(recorder).recordTransaction(merchantA.address, 50000 * 1e6);

    // Finalize period 2 (merchantA participated)
    await fresh.finalizePeriod(2);
    const period2Pool = await fresh.periodPool(2);

    // Pool should include rolled-over balance from period 1 + period 2 revenue
    // 200K was in contract at period 2 finalization, plus 100K just arrived = ~300K
    // (minus the dust from merchantA's period 2 activity recording, which may have
    // triggered period advance before the 3rd funding)
    expect(period2Pool).to.be.gte(ethers.utils.parseEther("200000"));

    // Merchant A gets the entire rolled-over pool (sole participant)
    await fresh.connect(merchantA).claimPayment(2);
    const earned = await fresh.totalEarnedByWorker(merchantA.address);
    expect(earned).to.equal(period2Pool);
    expect(earned).to.be.gte(ethers.utils.parseEther("200000"));
  });
});


describe("HeadhunterCompetitionPool (referral-weighted)", function () {
  let pool: any;
  let token: any;
  let admin: SignerWithAddress;
  let recorder: SignerWithAddress;
  let hunterA: SignerWithAddress;
  let hunterB: SignerWithAddress;
  let newUser1: SignerWithAddress;
  let newUser2: SignerWithAddress;
  let newUser3: SignerWithAddress;
  let feeSource: SignerWithAddress;

  const SEED = ethers.utils.parseEther("100000");
  const MAX_PAYOUT = ethers.utils.parseEther("500000");

  async function deployFixture() {
    [admin, recorder, hunterA, hunterB, newUser1, newUser2, newUser3, feeSource] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("200000000"));
    const F = await ethers.getContractFactory("HeadhunterCompetitionPool");
    pool = await F.deploy(token.address, admin.address, MAX_PAYOUT);
    await pool.deployed();
    await pool.connect(admin).grantRecorder(recorder.address);
    await token.transfer(feeSource.address, ethers.utils.parseEther("5000000"));
    await token.connect(feeSource).approve(pool.address, ethers.constants.MaxUint256);
    await pool.connect(feeSource).receiveFunding(SEED);
    return { pool, token, admin, recorder, hunterA, hunterB, newUser1, newUser2, newUser3, feeSource };
  }

  beforeEach(async function () {
    ({ pool, token, admin, recorder, hunterA, hunterB, newUser1, newUser2, newUser3, feeSource } = await loadFixture(deployFixture));
  });

  it("should register and qualify referrals", async function () {
    await pool.connect(recorder).registerReferral(newUser1.address, hunterA.address);
    expect(await pool.referredBy(newUser1.address)).to.equal(hunterA.address);

    await pool.connect(recorder).qualifyReferral(newUser1.address);
    expect(await pool.isQualifiedReferral(newUser1.address)).to.be.true;
    expect(await pool.referralCount(hunterA.address)).to.equal(1);
  });

  it("should score proportional to qualified referrals", async function () {
    // Hunter A: 1 referral
    await pool.connect(recorder).registerReferral(newUser1.address, hunterA.address);
    await pool.connect(recorder).qualifyReferral(newUser1.address);

    // Hunter B: 2 referrals
    await pool.connect(recorder).registerReferral(newUser2.address, hunterB.address);
    await pool.connect(recorder).qualifyReferral(newUser2.address);
    await pool.connect(recorder).registerReferral(newUser3.address, hunterB.address);
    await pool.connect(recorder).qualifyReferral(newUser3.address);

    expect(await pool.scores(1, hunterA.address)).to.equal(1);
    expect(await pool.scores(1, hunterB.address)).to.equal(2);

    await time.increase(THIRTY_DAYS + 1);
    await pool.connect(recorder).registerReferral(admin.address, hunterA.address); // trigger new period
    await pool.finalizePeriod(1);

    await pool.connect(hunterA).claimPayment(1);
    await pool.connect(hunterB).claimPayment(1);

    const payA = await pool.totalEarnedByWorker(hunterA.address);
    const payB = await pool.totalEarnedByWorker(hunterB.address);

    // A: 1/3 of pool, B: 2/3 of pool
    expect(payA).to.equal(SEED.mul(1).div(3));
    expect(payB).to.equal(SEED.mul(2).div(3));
  });

  it("should reject self-referral", async function () {
    await expect(
      pool.connect(recorder).registerReferral(hunterA.address, hunterA.address)
    ).to.be.revertedWithCustomError(pool, "SelfReferral");
  });

  it("should reject duplicate referral registration", async function () {
    await pool.connect(recorder).registerReferral(newUser1.address, hunterA.address);
    await expect(
      pool.connect(recorder).registerReferral(newUser1.address, hunterB.address)
    ).to.be.revertedWithCustomError(pool, "AlreadyReferred");
  });

  it("should reject double qualification", async function () {
    await pool.connect(recorder).registerReferral(newUser1.address, hunterA.address);
    await pool.connect(recorder).qualifyReferral(newUser1.address);
    await expect(
      pool.connect(recorder).qualifyReferral(newUser1.address)
    ).to.be.revertedWithCustomError(pool, "AlreadyQualified");
  });

  it("should reject qualifying unregistered user", async function () {
    await expect(
      pool.connect(recorder).qualifyReferral(newUser1.address)
    ).to.be.revertedWithCustomError(pool, "NotReferred");
  });

  it("should not score unqualified referrals", async function () {
    // Register but don't qualify — no score
    await pool.connect(recorder).registerReferral(newUser1.address, hunterA.address);
    expect(await pool.scores(1, hunterA.address)).to.equal(0);
  });

  it("should roll over funds when nobody refers", async function () {
    // Deploy fresh pool
    const F2 = await ethers.getContractFactory("HeadhunterCompetitionPool");
    const fresh = await F2.deploy(token.address, admin.address, MAX_PAYOUT);
    await fresh.deployed();
    await fresh.connect(admin).grantRecorder(recorder.address);
    await token.connect(feeSource).approve(fresh.address, ethers.constants.MaxUint256);

    // Month 1: 50K arrives, nobody refers
    await fresh.connect(feeSource).receiveFunding(ethers.utils.parseEther("50000"));
    await time.increase(THIRTY_DAYS + 1);

    // Month 2: another 50K, still nobody
    await fresh.connect(feeSource).receiveFunding(ethers.utils.parseEther("50000"));
    // Trigger period advance
    await fresh.connect(recorder).registerReferral(newUser1.address, hunterA.address);
    await fresh.connect(recorder).qualifyReferral(newUser1.address);

    // Finalize period 1 (empty — nobody qualified in period 1)
    await fresh.finalizePeriod(1);
    expect(await fresh.periodPool(1)).to.equal(0);
    // 100K still sitting in contract
    expect(await token.balanceOf(fresh.address)).to.equal(ethers.utils.parseEther("100000"));

    await time.increase(THIRTY_DAYS + 1);

    // Month 3: 50K more, one hunter qualified in period 2
    await fresh.connect(feeSource).receiveFunding(ethers.utils.parseEther("50000"));
    await fresh.connect(recorder).registerReferral(newUser2.address, hunterA.address);

    // Finalize period 2 (hunterA had 1 qualified referral)
    await fresh.finalizePeriod(2);
    const period2Pool = await fresh.periodPool(2);

    // Should include all rolled-over funds: 100K + new revenue
    expect(period2Pool).to.be.gte(ethers.utils.parseEther("100000"));

    // Hunter A gets it all (sole participant)
    await fresh.connect(hunterA).claimPayment(2);
    expect(await fresh.totalEarnedByWorker(hunterA.address)).to.equal(period2Pool);
  });
});
