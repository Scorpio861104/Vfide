const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 4 — router-required, hard-burn, security lock, vaultOnly toggle', function () {
  let owner, alice, bob, other
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, SecurityHub, securityHub
  let Token, token

  beforeEach(async function () {
    [owner, alice, bob, other] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('VestingVault')
    vesting = await Vesting.deploy()
    await vesting.waitForDeployment()

    VaultHub = await ethers.getContractFactory('VaultHubMock')
    vaultHub = await VaultHub.deploy()
    await vaultHub.waitForDeployment()

    BurnRouter = await ethers.getContractFactory('BurnRouterMock')
    burnRouter = await BurnRouter.deploy()
    await burnRouter.waitForDeployment()

    SecurityHub = await ethers.getContractFactory('SecurityHubMock')
    securityHub = await SecurityHub.deploy()
    await securityHub.waitForDeployment()

    Token = await ethers.getContractFactory('VFIDEToken')
    token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress)
    await token.waitForDeployment()

    // register vaults used by presale
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)
    await vaultHub.setVault(bob.address, bob.address)
  })

  it('hard burn path: burnSink==address(0) decreases totalSupply', async function () {
    // presale mint to owner
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('50', 18))

    // configure burn router for hard burn: burnAmt=10, sanctumAmt=0, sinks=0
    await burnRouter.set(ethers.parseUnits('10', 18), 0, ethers.ZeroAddress, ethers.ZeroAddress)
    await token.setBurnRouter(burnRouter.target)

    const totalBefore = await token.totalSupply()
    // ensure owner is not system-exempt
    await token.setSystemExempt(owner.address, false)

    // transfer 20 tokens -> alice (vault) should cause a hard burn of 10
    await token.transfer(alice.address, ethers.parseUnits('20', 18))
    const totalAfter = await token.totalSupply()
    expect(totalAfter).to.equal(totalBefore - ethers.parseUnits('10', 18))
  })

  it('router-required when policyLocked: TEST_force_router_requirement reverts when router absent', async function () {
    // ensure burnRouter is zero
    // lock policy
    await token.lockPolicy()
    // call TEST helper that enforces router requirement path
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith('router required')
  })

  it('systemExempt bypasses fees (no burn applied when exempt)', async function () {
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('30', 18))

    // configure router with fees
    await burnRouter.set(ethers.parseUnits('5', 18), ethers.parseUnits('2', 18), ethers.ZeroAddress, ethers.ZeroAddress)
    await token.setBurnRouter(burnRouter.target)
    await token.setTreasurySink(bob.address)

    // exempt owner
    await token.setSystemExempt(owner.address, true)

    // transfer from owner -> alice should deliver full amount
    await token.transfer(alice.address, ethers.parseUnits('10', 18))
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits('10', 18))
  })

  it('securityHub staticcall forced-fail results in VF_LOCKED revert', async function () {
    // set presale and mint
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('10', 18))

    // set a SecurityHub (address != 0) so the contract checks _locked
    await token.setSecurityHub(securityHub.target)
    // enable TEST forcing staticcall fail path
    await token.TEST_setForceSecurityStaticcallFail(true)

    // transferring should revert with VF_LOCKED custom error
    await expect(token.transfer(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWithCustomError(token, 'VF_LOCKED')
  })

  it('vaultOnly toggle off allows EOA transfers between non-vault addresses', async function () {
    // turn vaultOnly off
    await token.setVaultOnly(false)

    // mint via presale to owner's vault first then allow owner to transfer to other EOA when vaultOnly is off
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('5', 18))

    // transfer owner -> other (not registered vault) should succeed when vaultOnly=false
    await token.transfer(other.address, ethers.parseUnits('1', 18))
    expect(await token.balanceOf(other.address)).to.equal(ethers.parseUnits('1', 18))
  })
})
