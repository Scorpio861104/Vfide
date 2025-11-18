const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 9 — burn-router permutations & systemExempt combos', function () {
  let owner, alice, bob, charlie, spender
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, spender] = await ethers.getSigners()

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

    // register vaults
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)
    await vaultHub.setVault(bob.address, bob.address)
    await vaultHub.setVault(charlie.address, charlie.address)

    // presale so owner can mint
    await token.setPresale(owner.address)
  })

  it('burn+sanctum both non-zero with sanctumSink != recipient routes correctly (soft-burn to burnSink)', async function () {
    await token.mintPresale(owner.address, ethers.parseUnits('100', 18))

    // router: burn=8 to charlie (soft-burn), sanctum=4 to bob
    await burnRouter.set(ethers.parseUnits('8', 18), ethers.parseUnits('4', 18), bob.address, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setSystemExempt(owner.address, false)

    const send = ethers.parseUnits('20', 18)
    await token.transfer(alice.address, send)

    // charlie got the burn part
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('8', 18))
    // bob got the sanctum part
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits('4', 18))
    // alice got the remainder
    const aliceBal = await token.balanceOf(alice.address)
    expect(aliceBal).to.equal(send - ethers.parseUnits('8', 18) - ethers.parseUnits('4', 18))
  })

  it('soft-burn (burnSink != 0) does not reduce totalSupply', async function () {
    await token.mintPresale(owner.address, ethers.parseUnits('50', 18))
    await burnRouter.set(ethers.parseUnits('5', 18), 0, ethers.ZeroAddress, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setSystemExempt(owner.address, false)

    const beforeTotal = await token.totalSupply()
    await token.transfer(alice.address, ethers.parseUnits('10', 18))
    const afterTotal = await token.totalSupply()
    // soft-burn routes to charlie, totalSupply unchanged
    expect(afterTotal).to.equal(beforeTotal)
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('5', 18))
  })

  it('systemExempt sender bypasses fees', async function () {
    await token.mintPresale(owner.address, ethers.parseUnits('30', 18))
    await burnRouter.set(ethers.parseUnits('3', 18), ethers.parseUnits('1', 18), bob.address, charlie.address)
    await token.setBurnRouter(burnRouter.target)

    // exempt owner
    await token.setSystemExempt(owner.address, true)
    await token.transfer(alice.address, ethers.parseUnits('10', 18))
    // no fees applied: alice receives full 10
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits('10', 18))
  })

  it('transferFrom applies fees same as transfer', async function () {
    await token.mintPresale(owner.address, ethers.parseUnits('40', 18))
    await burnRouter.set(ethers.parseUnits('2', 18), ethers.parseUnits('1', 18), bob.address, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setSystemExempt(owner.address, false)

    await token.approve(spender.address, ethers.parseUnits('10', 18))
    await token.connect(spender).transferFrom(owner.address, alice.address, ethers.parseUnits('10', 18))

    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('2', 18))
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits('1', 18))
  })
})
