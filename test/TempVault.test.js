const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TempVault Contract Tests', function () {
  let vault, owner, user, token;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('ERC20Mock');
    token = await Token.deploy('Test', 'TST');

    const Vault = await ethers.getContractFactory('TempVault');
    vault = await Vault.deploy();

    await token.mint(await vault.getAddress(), 1000);
  });

  it('should set owner correctly', async function () {
    expect(await vault.owner()).to.equal(owner.address);
  });

  it('should allow owner to withdraw', async function () {
    await expect(vault.withdraw(await token.getAddress(), user.address, 100))
      .to.changeTokenBalances(token, [vault, user], [-100, 100]);
  });

  it('should revert if non-owner tries to withdraw', async function () {
    await expect(
      vault.connect(user).withdraw(await token.getAddress(), user.address, 100)
    ).to.be.revertedWith('not owner');
  });
});
