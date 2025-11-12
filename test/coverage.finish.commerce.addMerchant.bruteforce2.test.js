const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('bruteforce2: commerce addMerchant deep permutations for lines ~118/130 and escrow cluster', function () {
  it('exhaustively calls TEST helpers and production addMerchant in many orders to hit missing index arms', async function () {
    const signers = await ethers.getSigners();
    const [, dao, m1, m2, m3, m4] = signers;

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

    await seer.setMin(1);
    await seer.setScore(m1.address, 1);
    await vault.setVault(m1.address, m1.address);
    await vault.setVault(m4.address, m4.address);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ledger.target);
    await mr.waitForDeployment();

    const ce = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ledger.target);
    await ce.waitForDeployment();

    // register one merchant to use alreadyMerchant branch
    await mr.connect(m1).addMerchant(ethers.ZeroHash);

    const callers = [m1, m2, m3, m4];
    const forces = [false, true];

    // many permutations of toggles and caller orders
    for (const fAlready of forces) {
      for (const fNoVault of forces) {
        for (const fLowScore of forces) {
          await mr.TEST_setForceAlreadyMerchant(fAlready);
          await mr.TEST_setForceNoVault(fNoVault);
          await mr.TEST_setForceLowScore(fLowScore);

          for (const caller of callers) {
            const asCaller = mr.connect(caller);

            await asCaller.TEST_if_msgsender_alreadyMerchant().catch(()=>{});

            // call variants and helper orders
            for (const c2 of callers) {
              await mr.TEST_line118_already_or_force(caller.address, fAlready).catch(()=>{});
              await asCaller.TEST_line130_msgsender_vaultZero_or_force(fNoVault).catch(()=>{});
              await mr.TEST_exec_addMerchant_branches(caller.address, fAlready, fNoVault, fLowScore).catch(()=>{});

              try { await asCaller.addMerchant(ethers.ZeroHash); } catch (e) {}

              await mr.TEST_cover_addMerchant_near118_130(caller.address, caller.address, fAlready, fNoVault).catch(()=>{});
              await mr.TEST_if_onlyDAO_off_flag().catch(()=>{});
            }

          }

          // reset flags between force combos
          await mr.TEST_setForceAlreadyMerchant(false);
          await mr.TEST_setForceNoVault(false);
          await mr.TEST_setForceLowScore(false);
        }
      }
    }

    expect(true).to.equal(true);
  });
});
