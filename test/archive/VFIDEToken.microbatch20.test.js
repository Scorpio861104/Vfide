const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch20 - leftover fee/vault/policy permutations', function () {
  let owner, alice, bob, charlie, treasury
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, treasury] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('contracts-min/mocks/VestingVault.sol:VestingVault')
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

    // wire router and sinks
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).setTreasurySink(treasury.address)

    // mint some tokens via presale helper (disable vaultOnly to mint EOAs)
    await token.connect(owner).setVaultOnly(false)
    await token.connect(owner).setPresale(owner.address)
    await token.connect(owner).mintPresale(alice.address, ethers.parseUnits('10000', 18))
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('10000', 18))
  // presale sets owner as systemExempt; clear to exercise fee paths in tests
  await token.connect(owner).setSystemExempt(owner.address, false)
  })

  async function setRouter(burn, sanctum, sanctumSink, burnSink) {
    await burnRouter.set(burn, sanctum, sanctumSink, burnSink)
    await token.connect(owner).setBurnRouter(burnRouter.target)
  }

  it('hard burn when burnSink == zero and sanctum routes to treasury', async function () {
    const burn = ethers.parseUnits('7', 18)
    const sanctum = ethers.parseUnits('3', 18)
    await setRouter(burn, sanctum, ethers.ZeroAddress, ethers.ZeroAddress)

    const tsBefore = await token.totalSupply()
    await token.connect(owner).transfer(bob.address, ethers.parseUnits('100', 18))
    const tsAfter = await token.totalSupply()
    // hard burn reduces totalSupply
    expect(tsAfter).to.be.lt(tsBefore)
    // sanctum should have been credited to treasury
    expect(await token.balanceOf(treasury.address)).to.be.gte(sanctum)
  })

  it('soft burn and sanctum to explicit sinks (both non-zero)', async function () {
    const burn = ethers.parseUnits('2', 18)
    const sanctum = ethers.parseUnits('1', 18)
    await setRouter(burn, sanctum, charlie.address, alice.address)

    // owner transfers so sinks receive amounts
    await token.connect(owner).transfer(bob.address, ethers.parseUnits('200', 18))

    expect(await token.balanceOf(alice.address)).to.be.gte(burn)
    expect(await token.balanceOf(charlie.address)).to.be.gte(sanctum)
  })

  it('systemExempt bypasses router fees', async function () {
    const burn = ethers.parseUnits('5', 18)
    const sanctum = ethers.parseUnits('5', 18)
    await setRouter(burn, sanctum, charlie.address, alice.address)

    // mark owner as exempt and transfer: no fees should be applied
    await token.connect(owner).setSystemExempt(owner.address, true)
  const before = await token.balanceOf(bob.address)
  await token.connect(owner).transfer(bob.address, ethers.parseUnits('10', 18))
  const after = await token.balanceOf(bob.address)
  // balances are BigInt in ethers v6; do arithmetic with native bigint
  expect(after - before).to.equal(ethers.parseUnits('10', 18))
  })

  it('policyLocked requires router (TEST helper path and view)', async function () {
    // remove router then lock policy and trigger the TEST helper that requires router
    await token.connect(owner).setBurnRouter(ethers.ZeroAddress)
    await token.connect(owner).lockPolicy()
    await token.connect(owner).TEST_setForcePolicyLockedRequireRouter(true)
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith('router required')
    // restore router and ensure view does not revert
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).TEST_setForcePolicyLockedRequireRouter(false)
    await token.TEST_force_router_requirement()
  })

  it('vault recognition: vaultOf returns same address (v==a) -> _isVault true', async function () {
    await vaultHub.setVault(alice.address, alice.address)
    // call TEST helper to assert _isVault true
    expect(await token.TEST_check_isVault(alice.address)).to.equal(true)
    // when vaultHub returns zero, _isVault should be false
    await token.connect(owner).setVaultHub(ethers.ZeroAddress)
    expect(await token.TEST_check_isVault(alice.address)).to.equal(false)
  })
})
