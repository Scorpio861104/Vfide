const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('VFIDEToken microbatch 14 — _isVault and vaultHub edge cases', function () {
	let owner, alice, bob
	let Vesting, vesting, VaultHub, vaultHub, Token, token

	beforeEach(async function () {
		[owner, alice, bob] = await ethers.getSigners()

		Vesting = await ethers.getContractFactory('contracts-min/mocks/VestingVault.sol:VestingVault')
		vesting = await Vesting.deploy()
		await vesting.waitForDeployment()

		VaultHub = await ethers.getContractFactory('VaultHubMock')
		vaultHub = await VaultHub.deploy()
		await vaultHub.waitForDeployment()

		Token = await ethers.getContractFactory('VFIDEToken')
		token = await Token.deploy(vesting.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress)
		await token.waitForDeployment()

		// setup: register owner as vault normally
		await vaultHub.setVault(owner.address, owner.address)
	})

	it('v==a && v!=0 -> _isVault true', async function () {
		expect(await token.TEST_check_isVault(owner.address)).to.equal(true)
	})

	it('v==0 fallback: vaultOf returns 0 -> _isVault false', async function () {
		// remove owner mapping
		await vaultHub.setVault(owner.address, ethers.ZeroAddress)
		expect(await token.TEST_check_isVault(owner.address)).to.equal(false)
	})

	it('v!=a and v!=0 -> _isVault false', async function () {
		// set a different vault (not equal to owner)
		await vaultHub.setVault(owner.address, bob.address)
		expect(await token.TEST_check_isVault(owner.address)).to.equal(false)
	})

	it('TEST_setForceVaultHubZero causes vault checks to be false', async function () {
		await token.TEST_setForceVaultHubZero(true)
		expect(await token.TEST_check_isVault(owner.address)).to.equal(false)
		await token.TEST_setForceVaultHubZero(false)
	})
})

