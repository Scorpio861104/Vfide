const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 5 — burn/sanctum permutations & vaultOnly rejections', function () {
  let owner, alice, bob, charlie, other
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, other] = await ethers.getSigners()

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

    // register vaults for presale
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)
    await vaultHub.setVault(bob.address, bob.address)
  })

  it('sanctum fallback: when sanctumSink==0, token sends sanctumAmt to treasurySink', async function () {
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('20', 18))

    // set treasury sink to bob
    await token.setTreasurySink(bob.address)

    // configure router: burn=0, sanctum=5, sanctumSink=0 -> fallback to treasurySink
    await burnRouter.set(0, ethers.parseUnits('5', 18), ethers.ZeroAddress, ethers.ZeroAddress)
    await token.setBurnRouter(burnRouter.target)

    // ensure owner not exempt
    await token.setSystemExempt(owner.address, false)

    await token.transfer(alice.address, ethers.parseUnits('10', 18))

    // bob should receive the sanctum portion
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits('5', 18))
  })

  it('TEST_force_policyLocked_require_router triggers router-required check when toggled', async function () {
    // toggle test flag that causes router requirement to be checked in _transfer fallback path
    await token.TEST_setForcePolicyLockedRequireRouter(true)
    // calling the helper should revert because router is not set
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith('router required')
  })

  it('soft-burn to non-zero burnSink increases sink balance', async function () {
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('30', 18))

    // configure router to soft-burn: burn=3 to charlie, sanctum=0
    await burnRouter.set(ethers.parseUnits('3', 18), 0, ethers.ZeroAddress, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setSystemExempt(owner.address, false)

    await token.transfer(alice.address, ethers.parseUnits('10', 18))

    // charlie should have received the soft-burn amount
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('3', 18))
  })

  it('vaultOnly active rejects transfers to non-vault recipients', async function () {
    // default vaultOnly=true; other.address is not registered as a vault
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('5', 18))

    // ensure other is not a vault
    expect(await token.TEST_check_isVault(other.address)).to.equal(false)

    await expect(token.transfer(other.address, ethers.parseUnits('1', 18))).to.be.revertedWith('to !vault')
  })
})
