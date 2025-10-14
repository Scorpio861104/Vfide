// Coverage stub for MerchantGateway.sol
const { expect } = require("chai");
describe("MerchantGateway", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
    const MerchantGateway = await ethers.getContractFactory("MerchantGateway");
    const contract = await MerchantGateway.deploy(owner.address);
    const address = await contract.getAddress();
    expect(address).to.exist;
  });
});