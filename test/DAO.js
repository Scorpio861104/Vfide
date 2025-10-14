// Coverage stub for DAO.sol
const { expect } = require("chai");
describe("DAO", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
  const DAO = await ethers.getContractFactory("DAO");
  // Pass dummy timelock address for testing
  const contract = await DAO.deploy(owner.address, owner.address);
  const address = await contract.getAddress();
  expect(address).to.exist;
  });
});