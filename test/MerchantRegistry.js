// Coverage stub for MerchantRegistry.sol
const { expect } = require("chai");
describe("MerchantRegistry", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    const contract = await MerchantRegistry.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});