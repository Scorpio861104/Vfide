const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Seer Audit: Is it Perfect?", function () {
  let owner, attacker, sybil;
  let ledger, seer, vaultHub, token;

  before(async function () {
    [owner, attacker, sybil] = await ethers.getSigners();

    // 1. Deploy Dependencies
    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    ledger = await ProofLedger.deploy(owner.address);
    await ledger.waitForDeployment();

    const MockVaultHub = await ethers.getContractFactory("MockVaultHub");
    vaultHub = await MockVaultHub.deploy();
    await vaultHub.waitForDeployment();

    const Seer = await ethers.getContractFactory("Seer");
    seer = await Seer.deploy(owner.address, await ledger.getAddress(), await vaultHub.getAddress());
    await seer.waitForDeployment();

    // 2. Deploy Token (MockERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy();
    await token.waitForDeployment();

    // 3. Configure Seer
    await seer.setModules(await ledger.getAddress(), await vaultHub.getAddress(), await token.getAddress());
    await seer.setThresholds(350, 700, 540, 560); // High Trust = 700
  });

  it("IMPERFECTION: Flash-Endorsement Attack", async function () {
    // 1. Baseline: Attacker is Neutral (500), cannot endorse
    let score = await seer.getScore(attacker.address);
    expect(score).to.equal(500);
    
    await expect(seer.connect(attacker).endorse(sybil.address))
        .to.be.revertedWith("Score too low to endorse");

    // 2. The "Flash Loan" (Simulated)
    // Attacker borrows 200,000 VFIDE (Max Bonus)
    // In a real flash loan, this happens in one transaction.
    // We simulate by minting, acting, and burning.
    const loanAmount = ethers.parseEther("200000");
    await token.mint(attacker.address, loanAmount);

    // 3. Check Score (Instantaneously updated)
    // Base 500 + 200 (Holding Bonus) = 700
    score = await seer.getScore(attacker.address);
    expect(score).to.equal(700);

    // 4. Perform Privileged Action (Endorse)
    // Attacker uses temporary wealth to vouch for Sybil
    // FIX: This should now REVERT because Capital Bonus is excluded from Endorsement Check.
    // Base (500) < High Trust (700).
    // Even with 200k tokens, the "Effective Score" for endorsing is still 500.
    await expect(seer.connect(attacker).endorse(sybil.address))
        .to.be.revertedWith("Score too low to endorse");

    // 5. Repay Loan
    await token.burn(attacker.address, loanAmount);

    // 6. Aftermath
    // Attacker score drops back to 500
    score = await seer.getScore(attacker.address);
    expect(score).to.equal(500);

    // Sybil should NOT have the endorsement
    const sybilScore = await seer.getScore(sybil.address);
    expect(sybilScore).to.equal(500); // No change
    
    // Conclusion: Attack Mitigated.
  });
});
