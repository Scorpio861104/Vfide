// Coverage stub for DAOTimelock.sol
const { expect } = require("chai");
describe("DAOTimelock", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const DAOTimelock = await ethers.getContractFactory("DAOTimelock");
    const contract = await DAOTimelock.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});