const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 11 — security locks & TEST toggles', function () {
  let owner, alice
  let Vesting, vesting, VaultHub, vaultHub, SecurityHub, securityHub, Token, token

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('contracts-min/mocks/VestingVault.sol:VestingVault')
    vesting = await Vesting.deploy()
    await vesting.waitForDeployment()

    VaultHub = await ethers.getContractFactory('VaultHubMock')
    vaultHub = await VaultHub.deploy()
    await vaultHub.waitForDeployment()

    SecurityHub = await ethers.getContractFactory('SecurityHubMock')
    securityHub = await SecurityHub.deploy()
    await securityHub.waitForDeployment()

    Token = await ethers.getContractFactory('VFIDEToken')
    token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress)
    await token.waitForDeployment()

    // register vaults for owner and alice
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)

    // set presale so owner can mint
    await token.setPresale(owner.address)
  })

  it('securityHub locked -> transfers revert with VF_LOCKED', async function () {
    // set security hub and mark owner's vault locked
    await token.setSecurityHub(securityHub.target)
    await securityHub.setLocked(owner.address, true)

    // mint a small amount
    await token.mintPresale(owner.address, ethers.parseUnits('5', 18))

    await expect(token.transfer(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWithCustomError(token, 'VF_LOCKED')
  })

  it('TEST_setForceSecurityStaticcallFail forces locked even if hub says unlocked', async function () {
    // set security hub but leave it unlocked
    await token.setSecurityHub(securityHub.target)
    await securityHub.setLocked(owner.address, false)

    // enable the TEST toggle to force staticcall fail path
    await token.TEST_setForceSecurityStaticcallFail(true)

    await token.mintPresale(owner.address, ethers.parseUnits('3', 18))
    await expect(token.transfer(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWithCustomError(token, 'VF_LOCKED')
  })

  it('TEST_setForceVaultHubZero makes _isVault return false', async function () {
    // by default owner is a vault
    expect(await token.TEST_check_isVault(owner.address)).to.equal(true)

    // force vaultHub zero and check
    await token.TEST_setForceVaultHubZero(true)
    expect(await token.TEST_check_isVault(owner.address)).to.equal(false)
  })

  it('when security unlocked and vaults set transfers succeed', async function () {
    // no security hub set; vaults present -> should allow transfer
    await token.mintPresale(owner.address, ethers.parseUnits('5', 18))
    await token.transfer(alice.address, ethers.parseUnits('1', 18))
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits('1', 18))
  })
})
