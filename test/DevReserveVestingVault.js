// Coverage stub for DevReserveVestingVault.sol
const { expect } = require("chai");
describe("DevReserveVestingVault", function () {
  it("should deploy", async function () {
    const [owner] = await ethers.getSigners();
  const DevReserveVestingVault = await ethers.getContractFactory("DevReserveVestingVault");
  // Pass dummy token address for testing
  const contract = await DevReserveVestingVault.deploy(owner.address, owner.address);
  const address = await contract.getAddress();
  expect(address).to.exist;
  });
});