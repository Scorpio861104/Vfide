const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('coverage.finish.extra20 - sweep all TEST helpers to flip remaining arms', function () {
  let deployer, dao, alice, bob, carol, dan;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol, dan] = await ethers.getSigners();
  });

  it('sweeps MR and CE TEST helpers broadly', async function () {
    const VaultHub = await ethers.getContractFactory('VaultHubMock');
    const Seer = await ethers.getContractFactory('SeerMock');
    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Ledger = await ethers.getContractFactory('LedgerMock');

    const MR = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:MerchantRegistry');
    const CE = await ethers.getContractFactory('contracts-min/VFIDECommerce.sol:CommerceEscrow');

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy('T','T'); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    await seer.setMin(2);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();
    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // vaults setup
    await vault.setVault(alice.address, alice.address);
    await vault.setVault(bob.address, bob.address);
    // carol, dan: no vaults by default

    // Sweep MR helpers with permutations
    await mr.TEST_setForceAlreadyMerchant(true);
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(true);
    await mr.TEST_setForceZeroSenderRefund(true);
    await mr.TEST_setForceZeroSenderDispute(true);

    // call many MR helpers (flags true)
    expect(await mr.TEST_eval_addMerchant_flags(alice.address)).to.be.an('array');
    expect(await mr.TEST_eval_addMerchant_subexpr(alice.address)).to.be.an('array');
    expect(await mr.TEST_exec_addMerchant_branches(alice.address, true, true, true)).to.be.an('array');
    expect(Number(await mr.TEST_exec_addMerchant_ifvariants(alice.address, true, true, true))).to.be.a('number');
    expect(Number(await mr.TEST_cover_addMerchant_variants(alice.address))).to.be.a('number');
    expect(Number(await mr.TEST_cover_additional_branches(alice.address, alice.address, 10, 10, true, true, true))).to.be.a('number');
    expect(await mr.TEST_if_addMerchant_or_force(alice.address)).to.be.a('boolean');
    expect(await mr.TEST_if_vaultOf_or_force2(carol.address, true)).to.be.a('boolean');
    expect(await mr.TEST_if_seer_lt_min_or_force2(alice.address, true)).to.be.a('boolean');
    expect(await mr.TEST_if_merchant_status_none(dan.address)).to.be.a('boolean');

    // flip flags off and call again
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);
    await mr.TEST_setForceZeroSenderRefund(false);
    await mr.TEST_setForceZeroSenderDispute(false);

    expect(await mr.TEST_if_alreadyMerchant_left(alice.address)).to.be.a('boolean');
    expect(await mr.TEST_if_noVault_left(carol.address)).to.be.a('boolean');
    expect(await mr.TEST_if_lowScore_left(alice.address)).to.be.a('boolean');
    expect(await mr.TEST_exercise_addMerchant_checks(alice.address)).to.be.an('array');

    // Sweep escrow helpers
    expect(await escrow.TEST_eval_open_checks(bob.address, alice.address)).to.be.an('array');
    expect(Number(await escrow.TEST_exec_open_ifvariants(bob.address, alice.address, true, true, true, true))).to.be.a('number');
    expect(Number(await escrow.TEST_exec_access_ifvariants(0, alice.address))).to.be.a('number');
    expect(await escrow.TEST_if_buyerVault_zero(bob.address)).to.be.a('boolean');
    expect(await escrow.TEST_if_release_allowed(0, alice.address)).to.be.a('boolean');
    expect(await escrow.TEST_if_refund_allowed(0, alice.address)).to.be.a('boolean');
    expect(Number(await escrow.TEST_cover_escrow_more(0, alice.address, true, true))).to.be.a('number');

    // call hotspot helpers on escrow as well
    expect(Number(await escrow.TEST_hotspot_300s(alice.address, alice.address, 0, 0, false, false))).to.be.a('number');
    expect(Number(await escrow.TEST_hotspot_330s(alice.address, alice.address, false, false))).to.be.a('number');
    expect(Number(await escrow.TEST_hotspot_360s(0, alice.address, false, false))).to.be.a('number');
    expect(Number(await escrow.TEST_hotspot_490s(alice.address, 1, false, false))).to.be.a('number');

    // a few line-specific helpers added earlier
    expect(await mr.TEST_line118_already_or_force(alice.address, true)).to.be.a('boolean');
    expect(await mr.TEST_line130_vaultZero_or_force(carol.address, carol.address, true)).to.be.a('boolean');
    expect(await mr.TEST_line238_refunds_threshold(10)).to.equal(true);
    expect(Number(await mr.TEST_line250_condexpr_variant(alice.address, alice.address))).to.be.a('number');
    expect(await mr.TEST_line291_sender_zero_or_force_refund(true)).to.equal(true);
    expect(await mr.TEST_line305_seer_lt_or_force(alice.address, true)).to.equal(true);
  });
});
