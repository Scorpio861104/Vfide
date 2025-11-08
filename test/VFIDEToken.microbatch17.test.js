const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 17 — remaining cond-exprs, vaultOnly=false and TEST toggles', function () {
  let owner, alice, bob, charlie, dave, eve, spender
  let Vesting, vesting, VaultHub, vaultHub, SecurityHub, security, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave, eve, spender] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('VestingVault')
    vesting = await Vesting.deploy()
    await vesting.waitForDeployment()

    VaultHub = await ethers.getContractFactory('VaultHubMock')
    vaultHub = await VaultHub.deploy()
    await vaultHub.waitForDeployment()

    SecurityHub = await ethers.getContractFactory('SecurityHubMock')
    security = await SecurityHub.deploy()
    await security.waitForDeployment()

    BurnRouter = await ethers.getContractFactory('BurnRouterMock')
    burnRouter = await BurnRouter.deploy()
    await burnRouter.waitForDeployment()

    Token = await ethers.getContractFactory('VFIDEToken')
    token = await Token.deploy(vesting.target, vaultHub.target, security.target, ethers.ZeroAddress)
    await token.waitForDeployment()

  // wire optional modules
  await token.connect(owner).setSecurityHub(security.target)

    // register only owner/alice as vaults
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)

  // presale mint to owner for balances
  await token.connect(owner).setPresale(owner.address)
  await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('50000', 18))
  // presale sets owner as systemExempt; ensure fees apply for tests unless explicitly set otherwise
  await token.connect(owner).setSystemExempt(owner.address, false)
  })

  const Z = ethers.ZeroAddress
  const amt = ethers.parseUnits('100', 18)

  it('both fees non-zero, sanctumSink==Z -> treasury when set, burn soft to charlie', async function () {
    await burnRouter.set(ethers.parseUnits('3',18), ethers.parseUnits('2',18), Z, charlie.address)
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).setTreasurySink(dave.address)

    await token.connect(owner).transfer(alice.address, amt)

    // charlie should receive soft-burn amount
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('3',18))
    // treasury should receive sanctum
    expect(await token.balanceOf(dave.address)).to.equal(ethers.parseUnits('2',18))
  })

  it('both fees non-zero, sanctumSink==Z with no treasury -> revert', async function () {
    await burnRouter.set(ethers.parseUnits('1',18), ethers.parseUnits('2',18), Z, bob.address)
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).setTreasurySink(ethers.ZeroAddress)
    // ensure owner not exempt
    await token.connect(owner).setSystemExempt(owner.address, false)
    await expect(token.connect(owner).transfer(alice.address, amt)).to.be.revertedWith('sanctum sink=0')
  })

  it('vaultOnly=false allows transfers to non-vault addresses', async function () {
    // ensure dave is not registered as a vault
    expect(await vaultHub.vaultOf(dave.address)).to.equal(ethers.ZeroAddress)
    await token.connect(owner).setVaultOnly(false)
    await token.connect(owner).transfer(dave.address, amt)
    expect(await token.balanceOf(dave.address)).to.equal(amt)
  })

  it('transferFrom works when vaultOnly=false and TEST_force_vaultHub_zero toggled', async function () {
    await token.connect(owner).setVaultOnly(false)
    // force vaultHub zero check to true (causes _isVault to return false)
    await token.TEST_setForceVaultHubZero(true)
    await token.approve(spender.address, amt)
    await token.connect(spender).transferFrom(owner.address, eve.address, amt)
    expect(await token.balanceOf(eve.address)).to.equal(amt)
    // restore
    await token.TEST_setForceVaultHubZero(false)
  })

  it('security staticcall fail (TEST) causes locked behavior', async function () {
    await token.TEST_setForceSecurityStaticcallFail(true)
    await expect(token.transfer(alice.address, amt)).to.be.revertedWithCustomError(token, 'VF_LOCKED')
    await token.TEST_setForceSecurityStaticcallFail(false)
  })

  it('policyLocked + TEST_force_policyLocked_require_router with router removed reverts via view helper', async function () {
    // remove router first, then lock policy so the locked-policy check will require router and view will revert
    await token.connect(owner).setBurnRouter(ethers.ZeroAddress)
    await token.connect(owner).lockPolicy()
    // enable test flag
    await token.TEST_setForcePolicyLockedRequireRouter(true)
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith('router required')
    // restore flag
    await token.TEST_setForcePolicyLockedRequireRouter(false)
  })
})
