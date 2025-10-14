// Coverage stub for MerchantPortal.sol
const { expect } = require("chai");
describe("MerchantPortal", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const MerchantPortal = await ethers.getContractFactory("MerchantPortal");
    const contract = await MerchantPortal.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});