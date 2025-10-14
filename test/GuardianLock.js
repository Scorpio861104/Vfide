// Coverage stub for GuardianLock.sol
const { expect } = require("chai");
describe("GuardianLock", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const GuardianLock = await ethers.getContractFactory("GuardianLock");
    const contract = await GuardianLock.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});