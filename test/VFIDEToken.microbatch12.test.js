const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 12 — matrix sweep for fee/exception permutations', function () {
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
    await vaultHub.setVault(charlie.address, charlie.address)

    // presale + mint big balance for owner to cover all permutations
    await token.setPresale(owner.address)
    await token.mintPresale(owner.address, ethers.parseUnits('100000', 18))
  // ensure owner is not system-exempt by default for fee permutations
  await token.setSystemExempt(owner.address, false)
  })

  const Z = ethers.ZeroAddress
  const amt = ethers.parseUnits('100', 18)

  const scenarios = [
    { name: 'no fees', burn: 0n, sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    { name: 'hard-burn', burn: ethers.parseUnits('5', 18), sanctum: 0n, sanctumSink: 'Z', burnSink: 'Z', fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    { name: 'soft-burn', burn: ethers.parseUnits('5', 18), sanctum: 0n, sanctumSink: 'Z', burnSink: 'CHARLIE', fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    { name: 'sanctum->bob', burn: 0n, sanctum: ethers.parseUnits('3', 18), sanctumSink: 'BOB', burnSink: 'Z', fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    { name: 'sanctum sink=0 & no treasury -> revert', burn: 0n, sanctum: ethers.parseUnits('2', 18), sanctumSink: 'Z', burnSink: 'Z', fromExempt: false, toExempt: false, transferFrom: false, expectRevert: true },
    { name: 'both fees sinks non-zero', burn: ethers.parseUnits('8', 18), sanctum: ethers.parseUnits('4', 18), sanctumSink: 'BOB', burnSink: 'CHARLIE', fromExempt: false, toExempt: false, transferFrom: false, expectRevert: false },
    { name: 'fromExempt bypass', burn: ethers.parseUnits('3', 18), sanctum: ethers.parseUnits('1', 18), sanctumSink: 'BOB', burnSink: 'CHARLIE', fromExempt: true, toExempt: false, transferFrom: false, expectRevert: false },
    { name: 'toExempt bypass', burn: ethers.parseUnits('3', 18), sanctum: ethers.parseUnits('1', 18), sanctumSink: 'BOB', burnSink: 'CHARLIE', fromExempt: false, toExempt: true, transferFrom: false, expectRevert: false },
    { name: 'transferFrom with fees', burn: ethers.parseUnits('2', 18), sanctum: ethers.parseUnits('1', 18), sanctumSink: 'BOB', burnSink: 'CHARLIE', fromExempt: false, toExempt: false, transferFrom: true, expectRevert: false }
  ]

  scenarios.forEach((s, idx) => {
    it(`scenario ${idx}: ${s.name}`, async function () {
      // normalize exemptions
      await token.setSystemExempt(owner.address, false)
      await token.setSystemExempt(alice.address, false)

  // resolve sink addresses for this scenario
  const sanctumSinkAddr = s.sanctumSink === 'Z' ? Z : (s.sanctumSink === 'BOB' ? bob.address : charlie.address)
  const burnSinkAddr = s.burnSink === 'Z' ? Z : (s.burnSink === 'BOB' ? bob.address : charlie.address)

  // configure router
  await burnRouter.set(s.burn, s.sanctum, sanctumSinkAddr, burnSinkAddr)
      await token.setBurnRouter(burnRouter.target)

      // ensure treasury sink is unset unless needed (we'll set for non-revert sanctum cases where sanctumSink==Z)
      if (s.sanctumSink === 'Z' && !s.expectRevert) {
        // provide a treasury sink so sanctum can route
        await token.setTreasurySink(bob.address)
      }

      // set exemptions for scenario
      if (s.fromExempt) await token.setSystemExempt(owner.address, true)
      if (s.toExempt) await token.setSystemExempt(alice.address, true)

  // debug: ensure exemptions reflect expectations
  const ownerExNow = await token.systemExempt(owner.address)
  const aliceExNow = await token.systemExempt(alice.address)
  // console output helps debug intermittent exemption issues
  console.log(`scenario ${idx} ownerEx=${ownerExNow} aliceEx=${aliceExNow}`)

      // capture before state
      const beforeOwner = await token.balanceOf(owner.address)
      const beforeAlice = await token.balanceOf(alice.address)
      const beforeCharlie = await token.balanceOf(charlie.address)
      const beforeBob = await token.balanceOf(bob.address)
      const beforeTotal = await token.totalSupply()

      // perform transfer or transferFrom
      if (s.expectRevert) {
        await expect(token.transfer(alice.address, amt)).to.be.revertedWith('sanctum sink=0')
        return
      }

      if (s.transferFrom) {
        await token.approve(spender.address, amt)
        await token.connect(spender).transferFrom(owner.address, alice.address, amt)
      } else {
        await token.transfer(alice.address, amt)
      }

      // capture after state
      const afterOwner = await token.balanceOf(owner.address)
      const afterAlice = await token.balanceOf(alice.address)
      const afterCharlie = await token.balanceOf(charlie.address)
      const afterBob = await token.balanceOf(bob.address)
      const afterTotal = await token.totalSupply()

      // compute expected remaining delivered if fees applied
      const burnAmt = s.burn
      const sanctumAmt = s.sanctum

      // if either endpoint exempt, fees are bypassed
      if (s.fromExempt || s.toExempt) {
        expect(afterAlice - beforeAlice).to.equal(amt)
        // totalSupply unchanged
        expect(afterTotal).to.equal(beforeTotal)
        return
      }

      // fees applied
      const remaining = amt - BigInt(burnAmt) - BigInt(sanctumAmt)
      // recipient receives remaining
      expect(afterAlice - beforeAlice).to.equal(remaining)

      // burn handling
      if (BigInt(burnAmt) > 0n) {
        if (burnSinkAddr === Z) {
          // hard burn: totalSupply reduced
          console.log(`hard-burn debug beforeTotal=${beforeTotal} afterTotal=${afterTotal} burnAmt=${BigInt(burnAmt)}`)
          expect(beforeTotal - afterTotal).to.equal(BigInt(burnAmt))
        } else {
          // soft-burn: burnSink balance increased
          expect(afterCharlie - beforeCharlie).to.equal(BigInt(burnAmt))
          expect(afterTotal).to.equal(beforeTotal)
        }
      }

      // sanctum handling
      if (BigInt(sanctumAmt) > 0n) {
        const sink = sanctumSinkAddr === Z ? bob.address : sanctumSinkAddr
        if (sink === bob.address) {
          expect(afterBob - beforeBob).to.equal(BigInt(sanctumAmt))
        }
      }
    })
  })
})
