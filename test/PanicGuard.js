// Coverage stub for PanicGuard.sol
const { expect } = require("chai");
describe("PanicGuard", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const PanicGuard = await ethers.getContractFactory("PanicGuard");
    const contract = await PanicGuard.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});