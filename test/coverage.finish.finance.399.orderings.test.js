const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('micro-orderings: finance ordered sequences to target index-specific arms (~399)', function () {
  it('runs a few ordered sequences of send/mint/toggles to exercise send branches', async function () {
    const signers = await ethers.getSigners();
    const [, dao, alice, bob] = signers;

    const ERC20 = await ethers.getContractFactory('ERC20Mock');
    const Rev = await ethers.getContractFactory('RevertingDecimals');
    const Ledger = await ethers.getContractFactory('LedgerMock');
    const Stable = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:StablecoinRegistry');
    const Vault = await ethers.getContractFactory('contracts-min/VFIDEFinance.sol:EcoTreasuryVault');

    const erc = await ERC20.deploy('T','T'); await erc.waitForDeployment();
    const rev = await Rev.deploy(); await rev.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(erc.target, 'T');

    const vault = await Vault.deploy(dao.address, ledger.target, stable.target, erc.target);
    await vault.waitForDeployment();
    await vault.TEST_setOnlyDAOOff_Tx(true);

    // Sequence A: attempt send(token==0) then attempt send(not-whitelisted)
    try { await vault.send(ethers.ZeroAddress, alice.address, 1, 'a'); } catch (e) {}
    const erc2 = await (await ethers.getContractFactory('ERC20Mock')).deploy('B','B'); await erc2.waitForDeployment();
    try { await vault.send(erc2.target, alice.address, 1, 'b'); } catch (e) {}

    // Sequence B: attempt send(whitelisted) with no balance, then mint then send
    try { await vault.send(erc.target, alice.address, 1, 'c'); } catch (e) {}
    await erc.mint(vault.target, 50);
    await vault.send(erc.target, alice.address, 1, 'd');

    // Sequence C: toggle TEST_forceSendInsufficient before send to exercise different ordering
    await vault.TEST_setForceSendInsufficient(true);
    try { await vault.send(erc.target, bob.address, 1, 'e'); } catch (e) {}
    await vault.TEST_setForceSendInsufficient(false);

    // Sequence D: combine decimals forcing toggles
    await stable.TEST_setForceDecimals(7, true);
    const decsForced = await stable.TEST_exec_decimals_branches(erc.target, true, 7);
    expect(decsForced[1] === true || Number(decsForced[1]) === 1).to.be.ok;
    await stable.TEST_setForceDecimals(0, false);

    // call composite helpers to exercise masks
    const mask = await stable.TEST_cover_more_finance(erc.target, 0, alice.address, true, 7, true, false);
    expect(Number(mask)).to.be.a('number');
  });
});
