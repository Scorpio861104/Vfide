const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SanctumVault Contract Tests', function () {
  let vault, dao, charity, approver, user;
  let token, ledger;

  beforeEach(async function () {
    [dao, charity, approver, user] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory('LedgerMock');
    ledger = await Ledger.deploy(false);

    const Token = await ethers.getContractFactory('ERC20Mock');
    token = await Token.deploy('Test', 'TST');
    await token.mint(dao.address, ethers.parseEther('1000'));

    const Vault = await ethers.getContractFactory('SanctumVault');
    vault = await Vault.deploy(dao.address, await ledger.getAddress());

    // Fund vault
    await token.transfer(await vault.getAddress(), ethers.parseEther('100'));
  });

  describe('Deployment', function () {
    it('should set DAO correctly', async function () {
      expect(await vault.dao()).to.equal(dao.address);
    });

    it('should set default approvals required', async function () {
      expect(await vault.approvalsRequired()).to.equal(1);
    });
  });

  describe('Charity Management', function () {
    it('should allow DAO to add charity', async function () {
      await expect(vault.approveCharity(charity.address, 'Charity A', 'Health'))
        .to.emit(vault, 'CharityApproved')
        .withArgs(charity.address, 'Charity A', 'Health');
      
      const info = await vault.charities(charity.address);
      expect(info.approved).to.be.true;
    });

    it('should revert if non-DAO adds charity', async function () {
      await expect(
        vault.connect(user).approveCharity(charity.address, 'A', 'B')
      ).to.be.revertedWithCustomError(vault, 'SANCT_NotDAO');
    });

    it('should allow DAO to remove charity', async function () {
      await vault.approveCharity(charity.address, 'A', 'B');
      await expect(vault.removeCharity(charity.address, 'Reason'))
        .to.emit(vault, 'CharityRemoved')
        .withArgs(charity.address, 'Reason');
      
      const info = await vault.charities(charity.address);
      expect(info.approved).to.be.false;
    });
  });

  describe('Disbursement', function () {
    beforeEach(async function () {
      await vault.approveCharity(charity.address, 'Charity A', 'Health');
    });

    it('should allow DAO to propose disbursement', async function () {
      await expect(vault.proposeDisbursement(charity.address, await token.getAddress(), 100, 'Campaign', 'Doc'))
        .to.emit(vault, 'DisbursementProposed');
    });

    it('should allow DAO to approve and execute disbursement', async function () {
      await vault.proposeDisbursement(charity.address, await token.getAddress(), 100, 'Campaign', 'Doc');
      const id = 1; // First proposal

      // DAO proposed, so already approved. Approvals required is 1.
      // So we can execute directly.
      await expect(vault.executeDisbursement(id))
        .to.emit(vault, 'DisbursementExecuted')
        .withArgs(id, charity.address, await token.getAddress(), 100);
      
      expect(await token.balanceOf(charity.address)).to.equal(100);
    });

    it('should revert if non-approver tries to approve', async function () {
      await vault.proposeDisbursement(charity.address, await token.getAddress(), 100, 'Campaign', 'Doc');
      await expect(
        vault.connect(user).approveDisbursement(1)
      ).to.be.revertedWith('not approver');
    });
  });
});
