// Coverage stub for CouncilElection.sol
const { expect } = require("chai");
describe("CouncilElection", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const CouncilElection = await ethers.getContractFactory("CouncilElection");
    const contract = await CouncilElection.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});