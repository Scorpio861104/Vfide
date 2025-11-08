const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 6 — fee permutations & systemExempt combos', function () {
  let owner, alice, bob, charlie, spender
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, spender] = await ethers.getSigners()

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

    // register vaults
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)
    await vaultHub.setVault(bob.address, bob.address)
  })

  it('burn+sanctum both non-zero with sanctumSink != recipient routes correctly', async function () {
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('100', 18))

    // configure router: burn=8 to charlie (soft-burn), sanctum=4 to bob
    await burnRouter.set(ethers.parseUnits('8', 18), ethers.parseUnits('4', 18), bob.address, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setSystemExempt(owner.address, false)

    // transfer from owner -> alice
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

  it('sender exempt bypasses fees while recipient exempt also bypasses', async function () {
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('50', 18))

    await burnRouter.set(ethers.parseUnits('5', 18), ethers.parseUnits('2', 18), bob.address, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setTreasurySink(bob.address)

    // exempt sender: no fees applied
    await token.setSystemExempt(owner.address, true)
    await token.transfer(alice.address, ethers.parseUnits('10', 18))
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits('10', 18))

    // exempt recipient: restore sender non-exempt and exempt recipient
    await token.setSystemExempt(owner.address, false)
    await token.setSystemExempt(alice.address, true)
    await token.transfer(alice.address, ethers.parseUnits('5', 18))
    // recipient exempt also bypasses fees: alice gains full amount
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits('15', 18))
  })

  it('transferFrom path applies fees the same as transfer', async function () {
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('40', 18))

    await burnRouter.set(ethers.parseUnits('2', 18), ethers.parseUnits('1', 18), bob.address, charlie.address)
    await token.setBurnRouter(burnRouter.target)
    await token.setSystemExempt(owner.address, false)

    // approve spender for owner
    await token.approve(spender.address, ethers.parseUnits('10', 18))
    // use signer to perform transferFrom
    await token.connect(spender).transferFrom(owner.address, alice.address, ethers.parseUnits('10', 18))

    // charlie got burn, bob got sanctum
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseUnits('2', 18))
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits('1', 18))
  })
})
