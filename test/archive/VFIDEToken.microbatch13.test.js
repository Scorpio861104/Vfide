const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 13 — policy/vault/presale/security/approve edges', function () {
	let owner, presale, alice, bob, spender
	let Vesting, vesting, VaultHub, vaultHub, SecurityHub, security, BurnRouter, burnRouter, Token, token

	beforeEach(async function () {
		[owner, presale, alice, bob, spender] = await ethers.getSigners()

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
		token = await Token.deploy(vesting.target, vaultHub.target, security.target, bob.address)
		await token.waitForDeployment()

		// register a couple of vaults
		await vaultHub.setVault(owner.address, owner.address)
		await vaultHub.setVault(alice.address, alice.address)

		// make owner the presale minter and mint some tokens for owner
		await token.connect(owner).setPresale(owner.address)
		await token.connect(owner).mintPresale(owner.address, ethers.parseUnits('1000', 18))

		// set security hub, router + treasury sink for normal fee paths
		await token.connect(owner).setSecurityHub(security.target)
		await token.connect(owner).setBurnRouter(burnRouter.target)
		await token.connect(owner).setTreasurySink(bob.address)
	})

	it('transfer 0 emits Transfer and returns (short-circuit)', async function () {
		const beforeOwner = await token.balanceOf(owner.address)
		await expect(token.transfer(alice.address, 0)).to.emit(token, 'Transfer').withArgs(owner.address, alice.address, 0n)
		const afterOwner = await token.balanceOf(owner.address)
		expect(afterOwner).to.equal(beforeOwner)
	})

	it('presale mint must target a registered vault when vaultOnly=true', async function () {
		// pick an address that's not a vault (spender) and attempt to mint -> revert
		await expect(token.mintPresale(spender.address, ethers.parseUnits('10', 18))).to.be.revertedWith('presale target !vault')

		// mint to a registered vault should succeed
		await token.mintPresale(alice.address, ethers.parseUnits('10', 18))
		expect(await token.balanceOf(alice.address)).to.equal(ethers.parseUnits('10', 18))
	})

	it('lockPolicy prevents disabling vaultOnly and prevents setting router/treasury to zero', async function () {
		// lock the policy
		await token.connect(owner).lockPolicy()

		// attempts to disable vaultOnly should revert with custom error
		await expect(token.connect(owner).setVaultOnly(false)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')

		// setting burnRouter to zero should revert with custom error
		await expect(token.connect(owner).setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')

		// setting treasury sink to zero should revert with custom error
		await expect(token.connect(owner).setTreasurySink(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, 'VF_POLICY_LOCKED')
	})

	it('security hub locked vaults cause transfer reverts (from locked vault)', async function () {
		// lock owner's vault in security hub mock
		await security.setLocked(owner.address, true)

		// attempt transfer should revert with custom error VF_LOCKED
		await expect(token.transfer(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWithCustomError(token, 'VF_LOCKED')
	})

	it('TEST_force_security_staticcall_fail also causes locked behavior', async function () {
		// enable failing staticcall path
		await token.TEST_setForceSecurityStaticcallFail(true)
		await expect(token.transfer(alice.address, ethers.parseUnits('1', 18))).to.be.revertedWithCustomError(token, 'VF_LOCKED')
		// restore
		await token.TEST_setForceSecurityStaticcallFail(false)
	})

	it('approve and transferFrom updates allowance and transfers correctly', async function () {
		const amt = ethers.parseUnits('5', 18)
		await token.approve(spender.address, amt)
		expect(await token.allowance(owner.address, spender.address)).to.equal(amt)

		await token.connect(spender).transferFrom(owner.address, alice.address, amt)
		expect(await token.balanceOf(alice.address)).to.equal(amt)
		expect(await token.allowance(owner.address, spender.address)).to.equal(0)
	})

	it('TEST_setForceVaultHubZero disables vault recognition', async function () {
		await token.TEST_setForceVaultHubZero(true)
		expect(await token.TEST_check_isVault(owner.address)).to.equal(false)
		await token.TEST_setForceVaultHubZero(false)
	})
})

