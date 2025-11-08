const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 10 — presale & policy guards', function () {
  let owner, other
  let Vesting, vesting, VaultHub, vaultHub, Token, token

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('VestingVault')
    vesting = await Vesting.deploy()
    await vesting.waitForDeployment()

    VaultHub = await ethers.getContractFactory('VaultHubMock')
    vaultHub = await VaultHub.deploy()
    await vaultHub.waitForDeployment()

    Token = await ethers.getContractFactory('VFIDEToken')
    token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress)
    await token.waitForDeployment()

    // register owner as a vault for positive tests
    await vaultHub.setVault(owner.address, owner.address)
    // set presale to owner
    await token.setPresale(owner.address)
  })

  it('mintPresale exceeding PRESALE_SUPPLY_CAP reverts with VF_CAP', async function () {
    const cap = ethers.parseUnits('75000000', 18) // 75M
    await expect(token.mintPresale(owner.address, cap + 1n)).to.be.revertedWithCustomError(token, 'VF_CAP')
  })

  it('presale mint to non-vault address reverts when vaultOnly active', async function () {
    // vaultOnly is true by default; attempt to mint to `other` which is not registered as vault
    await expect(token.mintPresale(other.address, ethers.parseUnits('1', 18))).to.be.revertedWith('presale target !vault')
  })

  it('setBurnRouter and setTreasurySink revert to zero when policyLocked', async function () {
    await token.lockPolicy()
    await expect(token.setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')
    await expect(token.setTreasurySink(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')
  })

  it('TEST_force_policyLocked_require_router enforces router requirement when toggled', async function () {
    // ensure no router set
    // toggle TEST flag
    await token.TEST_setForcePolicyLockedRequireRouter(true)
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith('router required')
    // now set a router and the view should not revert
    const BurnRouter = await ethers.getContractFactory('BurnRouterMock')
    const burnRouter = await BurnRouter.deploy()
    await burnRouter.waitForDeployment()
    await token.setBurnRouter(burnRouter.target)
    // calling the view should now not revert
    await token.TEST_force_router_requirement()
  })
})
