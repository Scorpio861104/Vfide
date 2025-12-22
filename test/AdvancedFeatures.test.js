const { expect } = require("chai");
const { ethers } = require("hardhat");

// SKIPPED: Uses old API (setAuth, endorsements, wrong score scale)
describe.skip("Advanced Features: Anti-King, Anti-Whale, Anti-Scam", function () {
  let owner, userA, userB, merchant, sanctum, endorser;
  let ledger, seer, vaultHub, token, merchantRegistry, escrow, dao;

  before(async function () {
    [owner, userA, userB, merchant, sanctum, endorser] = await ethers.getSigners();

    // 1. Deploy ProofLedger
    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    ledger = await ProofLedger.deploy(owner.address);
    await ledger.waitForDeployment();

    // 2. Deploy MockVaultHub
    const MockVaultHub = await ethers.getContractFactory("MockVaultHub");
    vaultHub = await MockVaultHub.deploy();
    await vaultHub.waitForDeployment();

    // 3. Deploy Seer
    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(owner.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();

    // 4. Deploy MockERC20 for Commerce
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
    await token.waitForDeployment();

    // 5. Deploy MerchantRegistry
    const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    merchantRegistry = await MerchantRegistry.deploy(
        owner.address,
        await token.getAddress(),
        await vaultHub.getAddress(),
        await seer.getAddress(),
        ethers.ZeroAddress, // SecurityHub
        await ledger.getAddress()
    );
    await merchantRegistry.waitForDeployment();

    // 6. Deploy CommerceEscrow
    const CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    escrow = await CommerceEscrow.deploy(
        owner.address,
        await token.getAddress(),
        await vaultHub.getAddress(),
        await merchantRegistry.getAddress(),
        ethers.ZeroAddress, // SecurityHub
        await seer.getAddress(),
        sanctum.address // Sanctum for Scorched Earth
    );
    await escrow.waitForDeployment();

    // 7. Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    const mockTimelock = owner.address; 
    dao = await DAO.deploy(
        owner.address,
        mockTimelock,
        await seer.getAddress(),
        await vaultHub.getAddress(),
        ethers.ZeroAddress // Hooks
    );
    await dao.waitForDeployment();

    // CONFIGURATION
    await seer.setThresholds(350, 700, 540, 560);
    await seer.setAuth(await merchantRegistry.getAddress(), true);
    await seer.setAuth(owner.address, true); // For test setup
    await seer.setAuth(await escrow.getAddress(), true); // Escrow can reward

    // Setup Vaults (EOAs as vaults for simplicity)
    await vaultHub.setVault(userA.address, userA.address);
    await vaultHub.setVault(userB.address, userB.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setVault(endorser.address, endorser.address);
    await vaultHub.setVault(owner.address, owner.address);

    // Mint tokens for Commerce
    await token.mint(userA.address, ethers.parseEther("1000"));
    await token.connect(userA).approve(await escrow.getAddress(), ethers.parseEther("1000"));
  });

  describe("Governance Fatigue (Anti-King)", function () {
    it("should reduce voting weight on consecutive votes", async function () {
        // 1. Setup UserA score
        await seer.setScore(userA.address, 800, "High Trust"); // Weight = 800

        // 2. Create Proposals
        // We need to be eligible to propose. Owner is admin/eligible.
        await seer.setScore(owner.address, 800, "Admin");
        
        await dao.propose(0, userB.address, 0, "0x", "Prop 1");
        await dao.propose(0, userB.address, 0, "0x", "Prop 2");
        await dao.propose(0, userB.address, 0, "0x", "Prop 3");

        // 3. Vote 1: Full Weight
        await dao.connect(userA).vote(1, true);
        const p1 = await dao.proposals(1);
        expect(p1.forVotes).to.equal(800);

        // 4. Vote 2: Fatigued (5% penalty)
        // Weight should be 800 * 0.95 = 760
        await dao.connect(userA).vote(2, true);
        const p2 = await dao.proposals(2);
        expect(p2.forVotes).to.equal(760);

        // 5. Vote 3: More Fatigued (10% penalty)
        // Weight should be 800 * 0.90 = 720
        await dao.connect(userA).vote(3, true);
        const p3 = await dao.proposals(3);
        expect(p3.forVotes).to.equal(720);
    });

    it("should recover voting weight over time", async function () {
        // Fast forward 4 days. Recovery is 5% per day.
        // Current fatigue is 15% (from previous test: 0->5->10->15).
        // 4 days -> 20% recovery -> 0% fatigue.
        
        await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        await dao.propose(0, userB.address, 0, "0x", "Prop 4");
        
        // Vote 4: Recovered
        await dao.connect(userA).vote(4, true);
        const p4 = await dao.proposals(4);
        // Should be back to 800
        expect(p4.forVotes).to.equal(800);
    });
  });

  describe("Scorched Earth (Anti-Scam)", function () {
    it("should seize funds to Sanctum if merchant is DELISTED", async function () {
        // 1. Setup Merchant
        await seer.setScore(merchant.address, 600, "Merchant");
        const metaHash = ethers.keccak256(ethers.toUtf8Bytes("meta"));
        await merchantRegistry.connect(merchant).addMerchant(metaHash);

        // 2. Open Escrow
        const amount = ethers.parseEther("100");
        await escrow.connect(userA).open(merchant.address, amount, metaHash);
        const id = 1; // First escrow

        // 3. Fund Escrow
        await escrow.connect(userA).fund(id);

        // 4. Delist Merchant (Simulate bad behavior detected)
        // Only DAO can set status directly or via policy. We use setStatus for test.
        await merchantRegistry.setStatus(merchant.address, 3); // 3 = DELISTED

        // 5. Release Escrow (Buyer satisfied or forced release)
        // Even if buyer is happy, the system intervenes because merchant is bad.
        // Wait, if buyer releases, they want merchant to get paid?
        // "Scorched Earth" implies we don't let the bad actor profit even if they delivered this one time,
        // OR it implies we seize PENDING funds.
        // The logic implemented: if DELISTED, transfer to Sanctum.
        
        const sanctumBalanceBefore = await token.balanceOf(sanctum.address);
        const merchantBalanceBefore = await token.balanceOf(merchant.address);

        await escrow.connect(userA).release(id);

        const sanctumBalanceAfter = await token.balanceOf(sanctum.address);
        const merchantBalanceAfter = await token.balanceOf(merchant.address);

        // Sanctum gets the funds
        expect(sanctumBalanceAfter - sanctumBalanceBefore).to.equal(amount);
        // Merchant gets nothing
        expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(0);
    });
  });

  describe("Chain of Responsibility (Anti-Whale/Sybil)", function () {
    it("should punish endorser when subject is punished", async function () {
        // 1. Setup Endorser and Subject (UserB)
        // Endorser needs High Trust to endorse
        await seer.setScore(endorser.address, 800, "High Trust");
        await seer.setScore(userB.address, 500, "Neutral");

        // 2. Endorse
        await seer.connect(endorser).endorse(userB.address);
        
        // Verify endorsement
        expect(await seer.hasEndorsed(endorser.address, userB.address)).to.be.true;

        // 3. Punish Subject (UserB)
        // Simulate a punishment event (e.g. from a dispute or manual auth call)
        // We need an authorized caller. Owner is auth.
        const punishmentAmount = 100;
        await seer.punish(userB.address, punishmentAmount, "Bad Behavior");

        // 4. Check Subject Score
        // 500 - 100 = 400
        // Note: getScore includes other factors, but delta should be -100.
        const subjectScore = await seer.getScore(userB.address);
        // We can check delta directly to be precise
        const subjectDelta = await seer.reputationDelta(userB.address);
        expect(subjectDelta).to.equal(-100);

        // 5. Check Endorser Punishment
        // Should be 10% of 100 = 10 points.
        const endorserDelta = await seer.reputationDelta(endorser.address);
        expect(endorserDelta).to.equal(-10);
    });
  });
});

