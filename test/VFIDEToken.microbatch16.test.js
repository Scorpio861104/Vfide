const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 16 — exhaustive sink/fee/treasury permutations', function () {
  let owner, alice, bob, charlie, dave, spender
  let Vesting, vesting, VaultHub, vaultHub, SecurityHub, security, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, dave, spender] = await ethers.getSigners()

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

    // register vaults
    await vaultHub.setVault(owner.address, owner.address)
    await vaultHub.setVault(alice.address, alice.address)
    await vaultHub.setVault(bob.address, bob.address)
    await vaultHub.setVault(charlie.address, charlie.address)

    // presale and mint
    await token.connect(owner).setPresale(owner.address)
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('50000', 18))
  })

  const Z = ethers.ZeroAddress
  const amt = ethers.parseUnits('100', 18)

  const cases = [
    // 0: sanctumSink==Z, treasury set -> route to treasury
    { name: 'sanctum Z -> treasury', burn: 0n, sanctum: ethers.parseUnits('2',18), sanctumSink: 'Z', burnSink: 'Z', setTreasury: true, expectRevert: false },
    // 1: sanctum Z, treasury not set -> revert
    { name: 'sanctum Z -> no treasury revert', burn: 0n, sanctum: ethers.parseUnits('2',18), sanctumSink: 'Z', burnSink: 'Z', setTreasury: false, expectRevert: true },
    // 2: soft burn to bob
    { name: 'soft burn to bob', burn: ethers.parseUnits('5',18), sanctum: 0n, sanctumSink: 'Z', burnSink: 'BOB', setTreasury: false, expectRevert: false },
    // 3: soft burn to charlie + sanctum to bob
    { name: 'soft burn charlie + sanctum bob', burn: ethers.parseUnits('3',18), sanctum: ethers.parseUnits('4',18), sanctumSink: 'BOB', burnSink: 'CHARLIE', setTreasury: false, expectRevert: false },
    // 4: both sinks Z but treasury present (sanctum->treasury, burn hard burn)
    { name: 'hard burn + sanctum->treasury', burn: ethers.parseUnits('1',18), sanctum: ethers.parseUnits('2',18), sanctumSink: 'Z', burnSink: 'Z', setTreasury: true, expectRevert: false },
    // 5: transferFrom with sinks -> exercise allowance path
    { name: 'transferFrom soft+sanctum', burn: ethers.parseUnits('2',18), sanctum: ethers.parseUnits('1',18), sanctumSink: 'BOB', burnSink: 'CHARLIE', setTreasury: false, transferFrom: true, expectRevert: false },
    // 6: fromExempt should bypass fees even when router returns values
    { name: 'fromExempt bypass sinks', burn: ethers.parseUnits('4',18), sanctum: ethers.parseUnits('1',18), sanctumSink: 'BOB', burnSink: 'CHARLIE', setTreasury: false, fromExempt: true, expectRevert: false },
    // 7: TEST_force_policyLocked_require_router true should enforce router presence when policyLocked is set
    { name: 'policyLocked + TEST_force require router', burn: 0n, sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', setTreasury: false, enforceRouter: true, policyLockThenRemoveRouter: true, expectRevert: true }
  ]

  cases.forEach((c, i) => {
    it(`case ${i}: ${c.name}`, async function () {
      // configure router outputs and presence
      await burnRouter.set(c.burn, c.sanctum, c.sanctumSink === 'Z' ? Z : (c.sanctumSink === 'BOB' ? bob.address : charlie.address), c.burnSink === 'Z' ? Z : (c.burnSink === 'CHARLIE' ? charlie.address : bob.address))
      await token.connect(owner).setBurnRouter(burnRouter.target)

      // treasury set/unset
      if (c.setTreasury) await token.connect(owner).setTreasurySink(dave.address)
      else await token.connect(owner).setTreasurySink(ethers.ZeroAddress)

      // optional policy/router flow
      if (c.policyLockThenRemoveRouter) {
        // remove router then lock policy to force require
        await token.connect(owner).setBurnRouter(ethers.ZeroAddress)
        await token.connect(owner).lockPolicy()
        // enable TEST flag that simulates requiring router (same effect)
        await token.TEST_setForcePolicyLockedRequireRouter(true)
      }

      // exemptions
      if (c.fromExempt) await token.connect(owner).setSystemExempt(owner.address, true)
      else await token.connect(owner).setSystemExempt(owner.address, false)
      await token.connect(owner).setSystemExempt(alice.address, false)

      // allowance pre-setup for transferFrom case
      if (c.transferFrom) {
        await token.approve(spender.address, amt)
      }

      // perform transfer action and assert behavior
      if (c.expectRevert) {
        if (c.transferFrom) {
          await expect(token.connect(spender).transferFrom(owner.address, alice.address, amt)).to.be.reverted
        } else {
          await expect(token.connect(owner).transfer(alice.address, amt)).to.be.reverted
        }
        return
      }

      if (c.transferFrom) {
        await token.connect(spender).transferFrom(owner.address, alice.address, amt)
      } else {
        await token.connect(owner).transfer(alice.address, amt)
      }

      // verify simple post-conditions for sinks
      if (c.burnSink === 'BOB') {
        if (c.fromExempt) {
          expect((await token.balanceOf(bob.address))).to.equal(0)
        } else {
          expect((await token.balanceOf(bob.address))).to.be.greaterThan(0)
        }
      }
      if (c.burnSink === 'CHARLIE') {
        if (c.fromExempt) {
          expect((await token.balanceOf(charlie.address))).to.equal(0)
        } else {
          expect((await token.balanceOf(charlie.address))).to.be.greaterThan(0)
        }
      }
      if (c.sanctum > 0n) {
        if (c.fromExempt) {
          // when fromExempt, sanctum shouldn't be taken
          if (c.sanctumSink === 'BOB') expect((await token.balanceOf(bob.address))).to.equal(0)
          if (c.sanctumSink === 'Z' && c.setTreasury) expect((await token.balanceOf(dave.address))).to.equal(0)
        } else {
          if (c.sanctumSink === 'BOB') expect((await token.balanceOf(bob.address))).to.be.greaterThan(0)
          if (c.sanctumSink === 'Z' && c.setTreasury) expect((await token.balanceOf(dave.address))).to.be.greaterThan(0)
        }
      }
    })
  })
})
