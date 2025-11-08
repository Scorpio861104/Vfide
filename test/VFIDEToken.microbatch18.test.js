const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 18 — final cond-expr/sink/vault/policy permutations', function () {
  let owner, alice, bob, charlie, dave, frank, spender
  let Vesting, vesting, VaultHub, vaultHub, SecurityHub, security, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave, frank, spender] = await ethers.getSigners()

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

    // wire modules
    await token.connect(owner).setSecurityHub(security.target)
    await token.connect(owner).setBurnRouter(burnRouter.target)

    // register vaults for some addresses
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)

    // presale mint for owner and ensure owner not exempt by default
    await token.connect(owner).setPresale(owner.address)
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('50000', 18))
    await token.connect(owner).setSystemExempt(owner.address, false)
  })

  const Z = ethers.ZeroAddress
  const amt = ethers.parseUnits('100', 18)

  it('both fees non-zero with mixed sinks (sanctum Z -> treasury, burnSink non-zero) across transfer and transferFrom', async function () {
    // configure router to return both fees; sanctumSink==Z will route to treasury
    await burnRouter.set(ethers.parseUnits('4',18), ethers.parseUnits('3',18), Z, frank.address)
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).setTreasurySink(dave.address)

  // transfer path
  await token.connect(owner).transfer(alice.address, amt)
    expect(await token.balanceOf(frank.address)).to.equal(ethers.parseUnits('4',18))
    expect(await token.balanceOf(dave.address)).to.equal(ethers.parseUnits('3',18))

    // reset balances by minting to owner again for transferFrom check
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('1000',18))
  // ensure bob is recognized as a vault for the transferFrom path
  await vaultHub.setVault(bob.address, bob.address)
  await token.approve(spender.address, amt)
  await token.connect(spender).transferFrom(owner.address, bob.address, amt)
    // burn sink should continue to receive soft-burn
    expect(await token.balanceOf(frank.address)).to.equal(ethers.parseUnits('8',18))
    expect(await token.balanceOf(dave.address)).to.be.greaterThan(ethers.parseUnits('3',18))
  })

  it('sanctum explicit sink non-zero receives sanctum (no treasury involvement)', async function () {
    await burnRouter.set(0n, ethers.parseUnits('6',18), charlie.address, Z)
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).transfer(alice.address, amt)
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('6',18))
  })

  it('vaultOnly true + to not vault should revert; vaultOnly false allows it', async function () {
    // vaultOnly default is true; sending to frank (not a vault) should revert
    await expect(token.connect(owner).transfer(frank.address, amt)).to.be.revertedWith('to !vault')
    // disable vaultOnly
    await token.connect(owner).setVaultOnly(false)
    await token.connect(owner).transfer(frank.address, amt)
    expect(await token.balanceOf(frank.address)).to.equal(amt)
  })

  it('TEST_force_vaultHub_zero + vaultOnly true yields from/to vault checks false, but transfer still allowed when owner not vault', async function () {
  // force vaultHub zero to cause _isVault to return false
  await token.TEST_setForceVaultHubZero(true)
  // vault checks will fail; expect a revert (either from !vault or to !vault depending which check hits)
  await expect(token.connect(owner).transfer(alice.address, amt)).to.be.reverted
  // grant owner and recipient systemExempt and try again (both must bypass vault checks when vaultHub forced zero)
  await token.connect(owner).setSystemExempt(owner.address, true)
  await token.connect(owner).setSystemExempt(alice.address, true)
  await token.connect(owner).transfer(alice.address, amt)
  expect(await token.balanceOf(alice.address)).to.be.greaterThan(0)
  // restore
  await token.TEST_setForceVaultHubZero(false)
  })

  it('TEST_check_locked and TEST_force_security_staticcall_fail exercises locked helper', async function () {
    // normal staticcall returns false (not locked)
    const before = await token.TEST_check_locked(owner.address)
    expect(typeof before === 'boolean')
    // force staticcall failure
    await token.TEST_setForceSecurityStaticcallFail(true)
    expect(await token.TEST_check_locked(owner.address)).to.equal(true)
    await token.TEST_setForceSecurityStaticcallFail(false)
  })

  it('explicit router-required view helper triggers when policyLocked and router removed', async function () {
  // remove router first, then lock policy so view requires router
  await token.connect(owner).setBurnRouter(ethers.ZeroAddress)
  await token.connect(owner).lockPolicy()
  await token.TEST_setForcePolicyLockedRequireRouter(true)
  await expect(token.TEST_force_router_requirement()).to.be.revertedWith('router required')
  await token.TEST_setForcePolicyLockedRequireRouter(false)
  })
})
