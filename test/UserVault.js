// Coverage stub for UserVault.sol
const { expect } = require("chai");
describe("UserVault", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const UserVault = await ethers.getContractFactory("UserVault");
    const contract = await UserVault.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});