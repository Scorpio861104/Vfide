const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 7 — presale & policy guards', function () {
  let owner, alice, bob
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('VestingVault')
    vesting = await Vesting.deploy()
    await vesting.waitForDeployment()

    VaultHub = await ethers.getContractFactory('VaultHubMock')
    vaultHub = await VaultHub.deploy()
    await vaultHub.waitForDeployment()

    BurnRouter = await ethers.getContractFactory('BurnRouterMock')
    burnRouter = await BurnRouter.deploy()
    await burnRouter.waitForDeployment()

    Token = await ethers.getContractFactory('VFIDEToken')
    token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress)
    await token.waitForDeployment()

    // register only owner as vault; alice is not registered for one test
    await vaultHub.setVault(owner.address, owner.address)
  })

  it('presale target must be a vault when vaultOnly is active', async function () {
    await token.setPresale(owner.address)
    // attempt to presale-mint to alice (not a vault) should revert
    await expect(token.mintPresale(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWith('presale target !vault')
  })

  it('presale cap honored: cannot exceed PRESALE_SUPPLY_CAP', async function () {
    await token.setPresale(owner.address)
    const cap = ethers.parseUnits('75000000', 18) // 75M
    // mint up to cap
    await token.mintPresale(owner.address, cap)
    // further minting should revert with VF_CAP custom error
    await expect(token.mintPresale(owner.address, 1)).to.be.revertedWithCustomError(token, 'VF_CAP')
  })

  it('policy lock prevents setBurnRouter to zero (reverts with VF_POLICY_LOCKED)', async function () {
    // set a burn router first
    await token.setBurnRouter(burnRouter.target)
    // lock the policy
    await token.lockPolicy()
    // now setting router to zero should revert with custom error
    await expect(token.setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')
  })
})
