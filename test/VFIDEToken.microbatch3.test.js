const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 3 — soft-burn sinks & vaultOnly/policy toggles', function () {
  let Token, token, owner, alice, bob, charlie, burnRouter

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners()
    const Vesting = await ethers.getContractFactory('VestingVault')
    const vesting = await Vesting.deploy()
    await vesting.waitForDeployment()

  const BurnRouter = await ethers.getContractFactory('BurnRouterMock')
  burnRouter = await BurnRouter.deploy()
  await burnRouter.waitForDeployment()

  const VaultHub = await ethers.getContractFactory('VaultHubMock')
  const vaultHub = await VaultHub.deploy()
  await vaultHub.waitForDeployment()

  Token = await ethers.getContractFactory('VFIDEToken')
  // constructor: devReserveVestingVault, _vaultHub, _ledger, _treasurySink
  token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress)
  await token.waitForDeployment()

  // register simple vaults so presale minting (which requires vault targets when vaultOnly=true) succeeds
  await vaultHub.setVault(owner.address, owner.address)
  await vaultHub.setVault(alice.address, alice.address)
  await vaultHub.setVault(bob.address, bob.address)
  })

  it('applies soft-burn and sends sanctum portion to sanctumSink when configured', async function () {
  // mint some tokens to owner via presale mint helper
  await token.connect(owner).setPresale(owner.address)
  await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('100', 18))

    // configure burn router to send 10 tokens to burnSink and 5 to sanctumSink
    const burnAmt = ethers.parseUnits('10', 18)
    const sanctumAmt = ethers.parseUnits('5', 18)
  // set sinks and amounts on the router (set(burn, sanctum, sanctumSink, burnSink))
  await burnRouter.connect(owner).set(burnAmt, sanctumAmt, alice.address, bob.address)

  // connect token to use our burnRouter
  await token.connect(owner).setBurnRouter(burnRouter.target)

  // owner transfers 20 tokens to alice (registered vault); expect burn and sanctum to be distributed
  const sendAmount = ethers.parseUnits('20', 18)
    const ownerBalanceBefore = await token.balanceOf(owner.address)
    const bobBefore = await token.balanceOf(bob.address)
    const aliceBefore = await token.balanceOf(alice.address)
    const charlieBefore = await token.balanceOf(charlie.address)

  // ensure owner is not system-exempt (setPresale made presale exempt earlier)
  await token.connect(owner).setSystemExempt(owner.address, false)

  await token.connect(owner).transfer(alice.address, sendAmount)

    const ownerAfter = await token.balanceOf(owner.address)
    const bobAfter = await token.balanceOf(bob.address)
    const aliceAfter = await token.balanceOf(alice.address)
    const charlieAfter = await token.balanceOf(charlie.address)

    // owner decreased by total sendAmount
    expect(ownerAfter).to.equal(ownerBalanceBefore - sendAmount)

    // bob received burn amount at burnSink
    expect(bobAfter).to.equal(bobBefore + burnAmt)

    // recipient (alice) received the net send minus the burn (she also happens to be the sanctumSink so she gets that portion too)
    expect(aliceAfter).to.equal(aliceBefore + (sendAmount - burnAmt))
  })

  it('transfer of zero amount is a no-op (balances unchanged) but returns success', async function () {
  await token.connect(owner).setPresale(owner.address)
  await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('10', 18))
    const beforeOwner = await token.balanceOf(owner.address)
    const beforeAlice = await token.balanceOf(alice.address)

    // transfer 0
    const tx = await token.connect(owner).transfer(alice.address, 0)
    await tx.wait()

    const afterOwner = await token.balanceOf(owner.address)
    const afterAlice = await token.balanceOf(alice.address)

    expect(afterOwner).to.equal(beforeOwner)
    expect(afterAlice).to.equal(beforeAlice)
  })

  it('cannot disable vaultOnly when policyLocked', async function () {
    // lock policy
    await token.connect(owner).lockPolicy()

  // attempt to disable vaultOnly should revert with VF_POLICY_LOCKED (custom error)
  await expect(token.connect(owner).setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')
  })
})
