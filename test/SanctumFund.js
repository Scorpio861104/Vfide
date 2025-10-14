// Coverage stub for SanctumFund.sol
const { expect } = require("chai");
describe("SanctumFund", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
  const SanctumFund = await ethers.getContractFactory("SanctumFund");
  // Pass dummy token address and initialOwner for testing
  const contract = await SanctumFund.deploy(owner.address, owner.address);
  const address = await contract.getAddress();
  expect(address).to.exist;
  });
});