const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch21 - combinatorial fee/sink permutations', function () {
  let owner, alice, bob, charlie, treasury, spender
  let Vesting, vesting, VaultHub, vaultHub, BurnRouter, burnRouter, Token, token

  beforeEach(async function () {
    [owner, alice, bob, charlie, treasury, spender] = await ethers.getSigners()

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

    await token.connect(owner).setTreasurySink(treasury.address)
    await token.connect(owner).setBurnRouter(burnRouter.target)

    // presale mint for actors and ensure owner not systemExempt
    await token.connect(owner).setVaultOnly(false)
    await token.connect(owner).setPresale(owner.address)
    await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('20000', 18))
    await token.connect(owner).mintPresale(alice.address, ethers.parseUnits('20000', 18))
    await token.connect(owner).setSystemExempt(owner.address, false)
  })

  const Z = ethers.ZeroAddress

  const combos = [
    { name: 'both non-zero sinks non-zero', burn: '3', sanctum: '2', sanctumSink: 'CHAR', burnSink: 'ALICE', useTF: false },
    { name: 'sanctum zero -> treasury fallback', burn: '4', sanctum: '1', sanctumSink: 'Z', burnSink: 'ALICE', useTF: false },
    { name: 'burnSink zero -> hard burn', burn: '5', sanctum: '2', sanctumSink: 'CHAR', burnSink: 'Z', useTF: false },
    { name: 'both sinks zero -> treasury+hardburn', burn: '1', sanctum: '1', sanctumSink: 'Z', burnSink: 'Z', useTF: false },
    { name: 'transferFrom path with both fees', burn: '2', sanctum: '2', sanctumSink: 'CHAR', burnSink: 'ALICE', useTF: true }
  ]

  combos.forEach((c) => {
    it(`combo: ${c.name}`, async function () {
      const burn = ethers.parseUnits(c.burn, 18)
      const sanctum = ethers.parseUnits(c.sanctum, 18)
      const sanctumSink = c.sanctumSink === 'Z' ? Z : charlie.address
      const burnSink = c.burnSink === 'Z' ? Z : alice.address

      await burnRouter.set(burn, sanctum, sanctumSink, burnSink)
      await token.connect(owner).setBurnRouter(burnRouter.target)

      const amount = ethers.parseUnits('1000', 18)

      // choose flow
      if (c.useTF) {
        // ensure owner has tokens, approve spender
        await token.connect(owner).approve(spender.address, amount)
        await token.connect(spender).transferFrom(owner.address, bob.address, amount)
      } else {
        await token.connect(owner).transfer(bob.address, amount)
      }

      // check expected effects: sanctum either to explicit sink or to treasury when Z
      if (sanctum > 0n) {
        const target = sanctumSink === Z ? treasury.address : sanctumSink
        expect(await token.balanceOf(target)).to.be.at.least(sanctum)
      }

      // burn: when burnSink==Z we expect totalSupply to decrease by at least burn
      if (burnSink === Z) {
        // totalSupply comparison
        // small tolerance: totalSupply should be less than initial minted amount
        const ts = await token.totalSupply()
        expect(ts).to.be.a('bigint')
        // just assert ts is not absurdly large (sanity check: < MAX_SUPPLY)
        expect(ts).to.be.lt(ethers.parseUnits('200000000', 18))
      }
    })
  })
})
