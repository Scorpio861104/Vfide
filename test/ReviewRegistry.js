// Coverage stub for ReviewRegistry.sol
const { expect } = require("chai");
describe("ReviewRegistry", function () {
  let owner, dao, seer, proof, escrow, buyer, merchant, registry, MockEscrow;
  beforeEach(async function () {
    try {
      const signers = await ethers.getSigners();
      console.log("Signers loaded");
      owner = signers[0];
      dao = signers[1];
      seer = signers[2];
      proof = signers[3];
      escrow = signers[4];
      buyer = signers[5];
      merchant = signers[6];
      console.log("owner:", owner.address);
      console.log("buyer:", buyer.address);
      console.log("merchant:", merchant.address);
      MockEscrow = await ethers.getContractFactory("MockEscrow");
      console.log("MockEscrow factory loaded");
      const mockEscrow = await MockEscrow.deploy();
      console.log("MockEscrow deployed at:", mockEscrow.address);
      const ReviewRegistry = await ethers.getContractFactory("ReviewRegistry");
      console.log("ReviewRegistry factory loaded");
      registry = await ReviewRegistry.deploy(owner.address);
      console.log("ReviewRegistry deployed at:", registry.address);
      await registry.connect(owner).setEscrow(mockEscrow.address);
      console.log("Escrow set in registry");
      // Set up a completed order in escrow for review
      await mockEscrow.setOrder(1, buyer.address, merchant.address, 100, 4); // Released state
      console.log("Order set in MockEscrow");
    } catch (err) {
      console.error("Setup error:", err);
      throw err;
    }
  });
  it("should allow buyer to leave review", async function () {
    await expect(registry.connect(buyer).leaveReview(1, 5, "Great!")).to.emit(registry, "Reviewed");
    const review = await registry.reviewOfOrder(1);
    expect(review.buyer).to.equal(buyer.address);
    expect(review.merchant).to.equal(merchant.address);
    expect(review.stars).to.equal(5);
    expect(review.text).to.equal("Great!");
  });

  it("should revert if stars are out of range", async function () {
    await expect(registry.connect(buyer).leaveReview(1, 0, "Bad")).to.be.revertedWithCustomError(registry, "BadStars");
    await expect(registry.connect(buyer).leaveReview(1, 6, "Bad")).to.be.revertedWithCustomError(registry, "BadStars");
  });

  it("should revert if not buyer", async function () {
    await expect(registry.connect(owner).leaveReview(1, 5, "Nope")).to.be.revertedWithCustomError(registry, "NotBuyer");
  });

  it("should revert if order not completed", async function () {
    const escrow2 = await MockEscrow.deploy();
  await escrow2.setOrder(2, buyer.address, merchant.address, 100, 1); // Initiated state
    await registry.connect(owner).setEscrow(escrow2.address);
    await expect(registry.connect(buyer).leaveReview(2, 5, "Nope")).to.be.revertedWithCustomError(registry, "NotCompleted");
  });

  it("should revert if already reviewed", async function () {
    await registry.connect(buyer).leaveReview(1, 5, "Great!");
    await expect(registry.connect(buyer).leaveReview(1, 4, "Again")).to.be.revertedWithCustomError(registry, "AlreadyReviewed");
  });

  it("should allow editing review within grace period", async function () {
    await registry.connect(buyer).leaveReview(1, 5, "Great!");
    await expect(registry.connect(buyer).editReview(1, 4, "Changed")).to.emit(registry, "ReviewEdited");
    const review = await registry.reviewOfOrder(1);
    expect(review.stars).to.equal(4);
    expect(review.text).to.equal("Changed");
  });

  it("should revert editing if not buyer", async function () {
    await registry.connect(buyer).leaveReview(1, 5, "Great!");
    await expect(registry.connect(owner).editReview(1, 4, "Nope")).to.be.revertedWithCustomError(registry, "NotBuyer");
  });

  it("should revert editing if stars out of range", async function () {
    await registry.connect(buyer).leaveReview(1, 5, "Great!");
    await expect(registry.connect(buyer).editReview(1, 0, "Nope")).to.be.revertedWithCustomError(registry, "BadStars");
    await expect(registry.connect(buyer).editReview(1, 6, "Nope")).to.be.revertedWithCustomError(registry, "BadStars");
  });

  it("should allow hiding review by gov", async function () {
    await registry.connect(buyer).leaveReview(1, 5, "Great!");
    await registry.connect(owner).hideReview(1, true);
    const review = await registry.reviewOfOrder(1);
    expect(review.hidden).to.equal(true);
  });

  it("should return weighted rating", async function () {
    await registry.connect(buyer).leaveReview(1, 5, "Great!");
    const [num, denom, scaled] = await registry.weightedRating(merchant.address);
    expect(num).to.be.gt(0);
    expect(denom).to.be.gt(0);
    expect(scaled).to.be.gt(0);
  });

  it("should deploy", async function () {
    expect(await registry.getAddress()).to.exist;
  });

  it("should set DAO", async function () {
    await registry.connect(owner).setDAO(dao.address);
    expect(await registry.dao()).to.equal(dao.address);
  });

  it("should set Seer", async function () {
    await registry.connect(owner).setSeer(seer.address);
    expect(await registry.seer()).to.equal(seer.address);
  });

  it("should set ProofSink", async function () {
    await registry.connect(owner).setProofSink(proof.address);
    expect(await registry.proof()).to.equal(proof.address);
  });

  it("should set Escrow", async function () {
    await registry.connect(owner).setEscrow(escrow.address);
    expect(await registry.escrow()).to.equal(escrow.address);
  });

  it("should set Settings", async function () {
    await registry.connect(owner).setSettings(12345, false);
    expect(await registry.editGraceSecs()).to.equal(12345);
    expect(await registry.allowEdits()).to.equal(false);
  });
});