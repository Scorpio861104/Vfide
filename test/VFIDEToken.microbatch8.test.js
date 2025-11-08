const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 8 — transfer cond-expr & router-required branches', function () {
  let owner, alice, bob, burnRouter, Vesting, vesting, VaultHub, vaultHub, BurnRouter, Token, token

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

    // register vaults
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)
    await vaultHub.setVault(bob.address, bob.address)

    // set presale so owner can mint small amounts for tests
    await token.setPresale(owner.address)
  })

  it('transfer 0 amount is a no-op (emits Transfer 0) and balances unchanged', async function () {
    const beforeOwner = await token.balanceOf(owner.address)
    // mint a small amount so balances are deterministic
    await token.mintPresale(owner.address, ethers.parseUnits('1', 18))
    const ownerBal = await token.balanceOf(owner.address)
    await token.transfer(alice.address, 0)
    expect(await token.balanceOf(owner.address)).to.equal(ownerBal)
    expect(await token.balanceOf(alice.address)).to.equal(0)
  })

  it('policyLocked requires router when no burnRouter set (revert "router required")', async function () {
    // mint some tokens
    await token.mintPresale(owner.address, ethers.parseUnits('10', 18))
    // lock policy so router becomes required when absent
    await token.lockPolicy()

    await expect(token.transfer(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWith('router required')
  })

  it('hard-burn path reduces totalSupply when burnSink == address(0)', async function () {
    // mint and set router to return a burn amount with burnSink == address(0)
    await token.mintPresale(owner.address, ethers.parseUnits('20', 18))

    // set router to burn 5, sanctum 0
    await burnRouter.set(ethers.parseUnits('5', 18), 0, ethers.ZeroAddress, ethers.ZeroAddress)
    await token.setBurnRouter(burnRouter.target)

    // ensure owner is not system-exempt so fees apply
    await token.setSystemExempt(owner.address, false)

    const beforeTotal = await token.totalSupply()
    await token.transfer(alice.address, ethers.parseUnits('10', 18))
    const afterTotal = await token.totalSupply()
    expect(afterTotal).to.equal(beforeTotal - ethers.parseUnits('5', 18))
  })

  it('sanctum with zero treasurySink reverts with "sanctum sink=0" when sanctumSink == address(0)', async function () {
    // mint and set router to return sanctum > 0 with sanctumSink == address(0)
    await token.mintPresale(owner.address, ethers.parseUnits('10', 18))

    // ensure treasurySink is empty
    // do NOT set treasury sink on purpose

    // router returns burnAmt 0, sanctumAmt 2, sanctumSink == address(0)
    await burnRouter.set(0, ethers.parseUnits('2', 18), ethers.ZeroAddress, ethers.ZeroAddress)
    await token.setBurnRouter(burnRouter.target)

    // ensure owner not exempt so sanctum path executes
    await token.setSystemExempt(owner.address, false)

    await expect(token.transfer(alice.address, ethers.parseUnits('5', 18))).to.be.revertedWith('sanctum sink=0')
  })
})
