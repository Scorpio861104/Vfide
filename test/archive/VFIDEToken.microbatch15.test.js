const { expect } = require('chai')
const { ethers } = require('hardhat')

// Curated matrix to exercise fee/router/policy/vault permutations
describe('VFIDEToken microbatch 15 — policy/router/treasury/fee matrix', function () {
  let owner, alice, bob, charlie, spender
  let Vesting, vesting, VaultHub, vaultHub, SecurityHub, security, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, spender] = await ethers.getSigners()

    Vesting = await ethers.getContractFactory('contracts-min/mocks/VestingVault.sol:VestingVault')
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

    // presale & mint large owner balance for permutations
    await token.connect(owner).setPresale(owner.address)
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('100000', 18))

    // default: set router and treasury sink (tests will toggle)
    await token.connect(owner).setBurnRouter(burnrouterAddress(burnRouter))
    await token.connect(owner).setBurnRouter(burnRouter.target)
    await token.connect(owner).setTreasurySink(charlie.address)
  })

  function burnrouterAddress(r) { return r.target } // helper (keeps patterns consistent)

  const Z = ethers.ZeroAddress
  const amt = ethers.parseUnits('100', 18)

  const matrix = [
    // router present, no fees
    { name: 'router present, no fees', router: true, burn: 0n, sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', treasury: false, policyLocked: false, fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    // router present, hard burn
    { name: 'router present, hard burn', router: true, burn: ethers.parseUnits('5',18), sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', treasury: true, policyLocked: false, fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    // router present, sanctum sink zero -> revert unless treasury present
    { name: 'sanctum sink zero + no treasury -> revert', router: true, burn: 0n, sanctum: ethers.parseUnits('3',18), sanctumSink: 'Z', burnSink: 'Z', treasury: false, policyLocked: false, fromExempt: false, toExempt: false, transferFrom: false, expectRevert: true },
    // router absent and policyLocked -> require router (should revert)
    { name: 'router absent + policyLocked -> revert', router: false, burn: 0n, sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', treasury: false, policyLocked: true, fromExempt: false, toExempt: false, transferFrom: false, expectRevert: true },
    // router absent but policyUnlocked -> no fees, ok
    { name: 'router absent + policyUnlocked -> ok', router: false, burn: 0n, sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', treasury: false, policyLocked: false, fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    // fromExempt bypass when router present with fees
    { name: 'fromExempt bypass', router: true, burn: ethers.parseUnits('2',18), sanctum: ethers.parseUnits('1',18), sanctumSink: 'BOB', burnSink: 'CHARLIE', treasury: false, policyLocked: false, fromExempt: true, toExempt: false, transferFrom: false, expectRevert: false },
    // toExempt bypass when router present with fees
    { name: 'toExempt bypass', router: true, burn: ethers.parseUnits('2',18), sanctum: ethers.parseUnits('1',18), sanctumSink: 'BOB', burnSink: 'CHARLIE', treasury: false, policyLocked: false, fromExempt: false, toExempt: true, transferFrom: false, expectRevert: false },
    // transferFrom path with fees
    { name: 'transferFrom with fees', router: true, burn: ethers.parseUnits('3',18), sanctum: ethers.parseUnits('1',18), sanctumSink: 'BOB', burnSink: 'CHARLIE', treasury: false, policyLocked: false, fromExempt: false, toExempt: false, transferFrom: true, expectRevert: false },
  ]

  matrix.forEach((s, idx) => {
    it(`matrix ${idx}: ${s.name}`, async function () {
      // configure router presence
      if (s.router) {
        await burnRouter.set(s.burn, s.sanctum, s.sanctumSink === 'Z' ? Z : (s.sanctumSink === 'BOB' ? bob.address : charlie.address), s.burnSink === 'Z' ? Z : (s.burnSink === 'CHARLIE' ? charlie.address : bob.address))
        await token.connect(owner).setBurnRouter(burnRouter.target)
      } else {
        await token.connect(owner).setBurnRouter(ethers.ZeroAddress)
      }

      // treasury presence
      if (s.treasury) {
        await token.connect(owner).setTreasurySink(charlie.address)
      } else {
        await token.connect(owner).setTreasurySink(ethers.ZeroAddress)
      }

      // policy lock
      if (s.policyLocked) {
        await token.connect(owner).lockPolicy()
      }

      // exemptions
      await token.connect(owner).setSystemExempt(owner.address, false)
      await token.connect(owner).setSystemExempt(alice.address, false)
      if (s.fromExempt) await token.connect(owner).setSystemExempt(owner.address, true)
      if (s.toExempt) await token.connect(owner).setSystemExempt(alice.address, true)

      // before state
      const beforeOwner = await token.balanceOf(owner.address)
      const beforeAlice = await token.balanceOf(alice.address)
      const beforeBob = await token.balanceOf(bob.address)
      const beforeCharlie = await token.balanceOf(charlie.address)
      const beforeTotal = await token.totalSupply()

      if (s.expectRevert) {
        await expect(token.connect(owner).transfer(alice.address, amt)).to.be.reverted
        return
      }

      if (s.transferFrom) {
        await token.approve(spender.address, amt)
        await token.connect(spender).transferFrom(owner.address, alice.address, amt)
      } else {
        await token.connect(owner).transfer(alice.address, amt)
      }

      // after state
      const afterAlice = await token.balanceOf(alice.address)
      const afterBob = await token.balanceOf(bob.address)
      const afterCharlie = await token.balanceOf(charlie.address)
      const afterTotal = await token.totalSupply()

      // if exemption present, alice should receive full amt
      if (s.fromExempt || s.toExempt) {
        expect(afterAlice - beforeAlice).to.equal(amt)
        expect(afterTotal).to.equal(beforeTotal)
        return
      }

      // otherwise, compute expected deducts when router present
      if (s.router) {
        const burnAmt = BigInt(s.burn || 0n)
        const sanctumAmt = BigInt(s.sanctum || 0n)
        const remaining = amt - burnAmt - sanctumAmt
        expect(afterAlice - beforeAlice).to.equal(remaining)
        if (burnAmt > 0n) {
          if ((s.burnSink === 'Z')) {
            expect(beforeTotal - afterTotal).to.equal(burnAmt)
          } else {
            // soft burn to charlie or bob
            const sinkAddr = s.burnSink === 'CHARLIE' ? charlie.address : bob.address
            expect((sinkAddr === charlie.address ? afterCharlie - beforeCharlie : afterBob - beforeBob)).to.equal(burnAmt)
            expect(afterTotal).to.equal(beforeTotal)
          }
        }
        if (sanctumAmt > 0n) {
          const sinkAddr = s.sanctumSink === 'BOB' ? bob.address : charlie.address
          // if sanctumSink == Z then treasury should have been set or revert would have happened earlier
          expect((sinkAddr === bob.address ? afterBob - beforeBob : afterCharlie - beforeCharlie)).to.equal(sanctumAmt)
        }
      } else {
        // router absent and policyUnlocked -> full amt delivered
        expect(afterAlice - beforeAlice).to.equal(amt)
      }
    })
  })
})
