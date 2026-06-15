import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

/**
 * ON-CHAIN INVARIANT — Seer's autonomous verdict is NEVER enforced on the fund path.
 *
 * Audit reference: SEER_CERTIFICATION.md ("the crux") + the Seer audit matrix block I/A. The vault calls
 * seerAutonomous.beforeAction(...) at every fund-movement point (CardBoundVault._enforceSeerAction, ~line 2092)
 * purely to OBSERVE, then DISCARDS the verdict — and wraps the call in try/catch (SEER-04) so a Seer outage
 * cannot brick fund movement. This was verified by source-read in the Seer audit; this test makes it an
 * executable on-chain proof, filling the one gap in test/hardhat (SecurityFixes.test.ts exercises
 * SeerAutonomous in ISOLATION — escalating restriction levels — but never proves the vault IGNORES the verdict).
 *
 * ── STATUS: STAGED, NOT YET RUN ─────────────────────────────────────────────────────────────────────────
 * This file was written in an environment WITHOUT solc (the Solidity compiler download is blocked), so it has
 * NOT been executed. It reuses the exact deployment + EIP-712 signing pattern proven in
 * MerchantPayIntentEdgeCases.test.ts, so it should run as-is in a compiler-equipped environment:
 *     NODE_OPTIONS='--import tsx' node --test test/hardhat/SeerVerdictIgnoredBoundary.test.ts
 * If the CardBoundVault constructor arity differs in your build, mirror the args from
 * MerchantPayIntentEdgeCases.test.ts (kept in lockstep there). Do not treat these as passing until run.
 * ────────────────────────────────────────────────────────────────────────────────────────────────────────
 */

let connectionPromise: Promise<any> | null = null;
async function getConnection() {
  connectionPromise ??= network.connect({ override: { allowUnlimitedContractSize: true } });
  return connectionPromise;
}

describe('Seer verdict is ignored on the fund path (non-custodial boundary)', () => {
  // `seerMock` selects which SeerAutonomous mock to wire onto the vault before the payment.
  async function fixture(seerMock: 'restricting' | 'reverting' | 'none') {
    const { ethers } = (await getConnection()) as any;
    const [dao, customer, merchant, feeSink, activeWallet] = await ethers.getSigners();

    const VaultHubStub = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:VaultHubStub');
    const vaultHub = await VaultHubStub.deploy();
    await vaultHub.waitForDeployment();

    const IntentValidator = await ethers.getContractFactory('CardBoundVaultIntentValidator');
    const intentValidator = await IntentValidator.deploy();
    await intentValidator.waitForDeployment();

    const PaymentQueueManagerImpl = await ethers.getContractFactory('CardBoundVaultPaymentQueueManager');
    const pqmImpl = await PaymentQueueManagerImpl.deploy(ethers.ZeroAddress, 0);
    await pqmImpl.waitForDeployment();
    const WithdrawalQueueManagerImpl = await ethers.getContractFactory('CardBoundVaultWithdrawalQueueManager');
    const wqmImpl = await WithdrawalQueueManagerImpl.deploy(ethers.ZeroAddress);
    await wqmImpl.waitForDeployment();
    const InheritanceManagerImpl = await ethers.getContractFactory('CardBoundVaultInheritanceManager');
    const imImpl = await InheritanceManagerImpl.deploy(ethers.ZeroAddress);
    await imImpl.waitForDeployment();
    const AdminManagerImpl = await ethers.getContractFactory('CardBoundVaultAdminManager');
    const amImpl = await AdminManagerImpl.deploy(ethers.ZeroAddress);
    await amImpl.waitForDeployment();

    await vaultHub.setVaultDependencies(
      await intentValidator.getAddress(),
      await pqmImpl.getAddress(),
      await wqmImpl.getAddress(),
      await imImpl.getAddress(),
      await amImpl.getAddress(),
    );

    const SeerStub = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:SeerScoreStub');
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(customer.address, 6000);
    await seer.setScore(merchant.address, 7000);

    const SecurityHub = await ethers.getContractFactory('test/contracts/mocks/SecurityHubMock.sol:SecurityHubMock');
    const securityHub = await SecurityHub.deploy();
    await securityHub.waitForDeployment();

    const Token = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:MutableDecimalsTokenStub');
    const token = await Token.deploy(18);
    await token.waitForDeployment();

    const Portal = await ethers.getContractFactory('MerchantPortal');
    const portal = await Portal.deploy(
      dao.address,
      await vaultHub.getAddress(),
      await seer.getAddress(),
      await securityHub.getAddress(),
    );
    await portal.waitForDeployment();

    const PaymentQueueManager = await ethers.getContractFactory('CardBoundVaultPaymentQueueManager');
    const paymentQueueManager = await PaymentQueueManager.deploy(dao.address, ethers.parseEther('2000'));
    await paymentQueueManager.waitForDeployment();
    const WithdrawalQueueManager = await ethers.getContractFactory('CardBoundVaultWithdrawalQueueManager');
    const withdrawalQueueManager = await WithdrawalQueueManager.deploy(dao.address);
    await withdrawalQueueManager.waitForDeployment();
    const InheritanceManager = await ethers.getContractFactory('CardBoundVaultInheritanceManager');
    const inheritanceManager = await InheritanceManager.deploy(dao.address);
    await inheritanceManager.waitForDeployment();
    const AdminManager = await ethers.getContractFactory('CardBoundVaultAdminManager');
    const adminManager = await AdminManager.deploy(dao.address);
    await adminManager.waitForDeployment();
    const AdminFacet = await ethers.getContractFactory('CardBoundVaultAdminFacet');
    const adminFacet = await AdminFacet.deploy();
    await adminFacet.waitForDeployment();

    await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
    await portal.connect(merchant).registerMerchant('Boundary Shop', 'retail');

    const Vault = await ethers.getContractFactory('CardBoundVault');
    const customerVault = await Vault.deploy(
      await vaultHub.getAddress(),
      await token.getAddress(),
      customer.address,        // admin (owner)
      activeWallet.address,    // active wallet (the only signer that can move funds)
      [dao.address],           // guardians
      1,                       // guardian threshold
      ethers.parseEther('1000'),
      ethers.parseEther('2000'),
      ethers.ZeroAddress,      // ledger
      await paymentQueueManager.getAddress(),
      await withdrawalQueueManager.getAddress(),
      await inheritanceManager.getAddress(),
      await adminManager.getAddress(),
      await adminFacet.getAddress(),
    );
    await customerVault.waitForDeployment();

    await vaultHub.setVault(customer.address, await customerVault.getAddress());
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setGuardianSetupComplete(await customerVault.getAddress(), true);

    // ── Wire the chosen SeerAutonomous mock onto the vault (admin-only setter, delegated to the facet). ──
    let seerAutonomousAddr = ethers.ZeroAddress;
    if (seerMock === 'restricting') {
      const M = await ethers.getContractFactory('test/contracts/mocks/SeerAutonomousBoundaryMocks.sol:SeerAutonomousRestrictingMock');
      const m = await M.deploy();
      await m.waitForDeployment();
      seerAutonomousAddr = await m.getAddress();
    } else if (seerMock === 'reverting') {
      const M = await ethers.getContractFactory('test/contracts/mocks/SeerAutonomousBoundaryMocks.sol:SeerAutonomousRevertingMock');
      const m = await M.deploy();
      await m.waitForDeployment();
      seerAutonomousAddr = await m.getAddress();
    }
    if (seerAutonomousAddr !== ethers.ZeroAddress) {
      // setSeerAutonomous is delegated to the admin facet via the vault fallback; admin = customer.
      await customerVault.connect(customer).setSeerAutonomous(seerAutonomousAddr);
    }

    await token.mint(await customerVault.getAddress(), ethers.parseEther('100'));

    const net = await ethers.provider.getNetwork();
    const chainId = BigInt(net.chainId);

    async function payOnce() {
      const nonce = await customerVault.nextNonce();
      const walletEpoch = await customerVault.walletEpoch();
      const latest = await ethers.provider.getBlock('latest');
      const intent = {
        vault: await customerVault.getAddress(),
        merchantPortal: await portal.getAddress(),
        token: await token.getAddress(),
        merchant: merchant.address,
        recipient: merchant.address,
        amount: ethers.parseEther('10'),
        nonce,
        walletEpoch,
        deadline: BigInt((latest?.timestamp ?? 0) + 3600),
        chainId,
      };
      const signature = await activeWallet.signTypedData(
        { name: 'CardBoundVault', version: '1', chainId: Number(chainId), verifyingContract: await customerVault.getAddress() },
        {
          PayIntent: [
            { name: 'vault', type: 'address' },
            { name: 'merchantPortal', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'merchant', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'walletEpoch', type: 'uint64' },
            { name: 'deadline', type: 'uint64' },
            { name: 'chainId', type: 'uint256' },
          ],
        },
        intent,
      );
      const before = await token.balanceOf(merchant.address);
      await portal.connect(merchant).payWithIntent(intent, signature, 'order-seer-boundary');
      const after = await token.balanceOf(merchant.address);
      return { delta: after - before, amount: intent.amount as bigint };
    }

    return { ethers, customerVault, payOnce };
  }

  it('baseline: a signed payment executes when no Seer hook is set', async () => {
    const { payOnce } = await fixture('none');
    const { delta, amount } = await payOnce();
    assert.equal(delta, amount); // sanity: the pay path itself works
  });

  it('CRUX: a maximally-RESTRICTING Seer verdict (Frozen) does NOT block the payment', async () => {
    const { payOnce, customerVault } = await fixture('restricting');
    const { delta, amount } = await payOnce();
    // The vault observed Seer's Frozen verdict and IGNORED it — funds still moved.
    assert.equal(delta, amount);
    assert.equal(await customerVault.nextNonce(), 1n);
  });

  it('SEER-04: a REVERTING Seer hook (outage) does NOT brick the payment (fail-open on funds)', async () => {
    const { payOnce, customerVault } = await fixture('reverting');
    const { delta, amount } = await payOnce();
    // try/catch absorbed the revert — funds still moved.
    assert.equal(delta, amount);
    assert.equal(await customerVault.nextNonce(), 1n);
  });
});
