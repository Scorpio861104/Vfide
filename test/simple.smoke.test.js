const { expect } = require('chai');

describe('Simple Smoke Test', function() {
  it('should verify basic setup', async function() {
    const [owner] = await ethers.getSigners();
    expect(owner.address).to.not.be.undefined;
  });
});
