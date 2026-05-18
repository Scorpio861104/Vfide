import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

// NOTE: This suite uses node:test, not Hardhat's built-in test runner.
// Run with: NODE_OPTIONS='--import tsx' node --test test/hardhat/MerchantPayIntentEdgeCases.test.ts

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect({
    override: { allowUnlimitedContractSize: true },
  });
  return connectionPromise;
}

describe("MerchantPortal.payWithIntent edge cases", () => {
  async function fixture() {
    const { ethers } = (await getConnection()) as any;
    const [dao, customer, merchant, feeSink, activeWallet, wrongSigner] = await ethers.getSigners();

    const VaultHubStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const vaultHub = await VaultHubStub.deploy();
    await vaultHub.waitForDeployment();

    const SeerStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();
    await seer.setScore(customer.address, 6000);
    await seer.setScore(merchant.address, 7000);

    const SecurityHub = await ethers.getContractFactory("test/contracts/mocks/SecurityHubMock.sol:SecurityHubMock");
    const securityHub = await SecurityHub.deploy();
    await securityHub.waitForDeployment();

    const SessionKeyManager = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SessionKeyManagerStub");
    const sessionKeyManager = await SessionKeyManager.deploy();
    await sessionKeyManager.waitForDeployment();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MutableDecimalsTokenStub");
    const token = await Token.deploy(18);
    await token.waitForDeployment();

    const Portal = await ethers.getContractFactory("MerchantPortal");
    const portal = await Portal.deploy(
      dao.address,
      await vaultHub.getAddress(),
      await seer.getAddress(),
      await securityHub.getAddress(),
      feeSink.address,
    );
    await portal.waitForDeployment();

    await portal.connect(dao).setAcceptedToken(await token.getAddress(), true);
    await portal.connect(merchant).registerMerchant("Edge Shop", "retail");

    const Vault = await ethers.getContractFactory("CardBoundVault");
    const customerVault = await Vault.deploy(
      await vaultHub.getAddress(),
      await token.getAddress(),
      customer.address,
      activeWallet.address,
      [dao.address],
      1,
      ethers.parseEther("1000"),
      ethers.parseEther("2000"),
      ethers.ZeroAddress,
    );
    await customerVault.waitForDeployment();

    await vaultHub.setVault(customer.address, await customerVault.getAddress());
    await vaultHub.setVault(merchant.address, merchant.address);
    await vaultHub.setGuardianSetupComplete(await customerVault.getAddress(), true);

    const fundedAmount = ethers.parseEther("100");
    await token.mint(await customerVault.getAddress(), fundedAmount);

    const net = await ethers.provider.getNetwork();
    const chainId = BigInt(net.chainId);

    async function buildIntent(overrides: Partial<Record<string, unknown>> = {}) {
      const nonce = await customerVault.nextNonce();
      const walletEpoch = await customerVault.walletEpoch();
      const latest = await ethers.provider.getBlock("latest");

      const intent = {
        vault: await customerVault.getAddress(),
        merchantPortal: await portal.getAddress(),
        token: await token.getAddress(),
        merchant: merchant.address,
        recipient: merchant.address,
        amount: ethers.parseEther("10"),
        nonce,
        walletEpoch,
        deadline: BigInt((latest?.timestamp ?? 0) + 3600),
        chainId,
        ...overrides,
      };

      return intent;
    }

    async function signIntent(intent: Record<string, unknown>, signer = activeWallet) {
      return signer.signTypedData(
        {
          name: "CardBoundVault",
          version: "1",
          chainId: Number(chainId),
          verifyingContract: await customerVault.getAddress(),
        },
        {
          PayIntent: [
            { name: "vault", type: "address" },
            { name: "merchantPortal", type: "address" },
            { name: "token", type: "address" },
            { name: "merchant", type: "address" },
            { name: "recipient", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "walletEpoch", type: "uint64" },
            { name: "deadline", type: "uint64" },
            { name: "chainId", type: "uint256" },
          ],
        },
        intent,
      );
    }

    return {
      ethers,
      dao,
      portal,
      token,
      sessionKeyManager,
      customerVault,
      customer,
      merchant,
      feeSink,
      wrongSigner,
      buildIntent,
      signIntent,
    };
  }

  async function deployFixture() {
    const { networkHelpers } = (await getConnection()) as any;
    return networkHelpers.loadFixture(fixture);
  }

  it("executes happy-path payment and increments vault nonce", async () => {
    const { portal, token, customerVault, merchant, buildIntent, signIntent } = await deployFixture();

    const intent = await buildIntent();
    const signature = await signIntent(intent);

    const merchantBefore = await token.balanceOf(merchant.address);
    await portal.connect(merchant).payWithIntent(intent, signature, "order-intent-1");
    const merchantAfter = await token.balanceOf(merchant.address);

    assert.equal(merchantAfter - merchantBefore, intent.amount as bigint);
    assert.equal(await customerVault.nextNonce(), 1n);
  });

  it("rejects replay of the same signed intent", async () => {
    const { portal, merchant, buildIntent, signIntent } = await deployFixture();

    const intent = await buildIntent();
    const signature = await signIntent(intent);

    await portal.connect(merchant).payWithIntent(intent, signature, "order-replay-1");
    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-replay-2"),
      /CBV_InvalidNonce|revert/i,
    );
  });

  it("rejects intent when merchantPortal field does not match submitting portal", async () => {
    const { portal, feeSink, merchant, buildIntent, signIntent } = await deployFixture();

    const intent = await buildIntent({ merchantPortal: feeSink.address });
    const signature = await signIntent(intent);

    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-wrong-portal"),
      /MERCH_IntentInvalid|revert/i,
    );
  });

  it("rejects expired signed intent", async () => {
    const { portal, ethers, merchant, buildIntent, signIntent } = await deployFixture();

    const latest = await ethers.provider.getBlock("latest");
    const intent = await buildIntent({ deadline: BigInt((latest?.timestamp ?? 0) - 1) });
    const signature = await signIntent(intent);

    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-expired"),
      /MERCH_IntentInvalid|revert/i,
    );
  });

  it("rejects recipient mismatch against resolved merchant recipient", async () => {
    const { portal, feeSink, merchant, buildIntent, signIntent } = await deployFixture();

    const intent = await buildIntent({ recipient: feeSink.address });
    const signature = await signIntent(intent);

    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-bad-recipient"),
      /MERCH_IntentRecipientMismatch|revert/i,
    );
  });

  it("rejects when signature is from a non-active wallet", async () => {
    const { portal, merchant, wrongSigner, buildIntent, signIntent } = await deployFixture();

    const intent = await buildIntent();
    const signature = await signIntent(intent, wrongSigner);

    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-bad-signer"),
      /CBV_InvalidSigner|revert/i,
    );
  });

  it("enforces SessionKeyManager spend gate when configured", async () => {
    const { portal, sessionKeyManager, dao, merchant, buildIntent, signIntent } = await deployFixture() as any;

    await portal.connect(dao).setSessionKeyManager(await sessionKeyManager.getAddress());
    await sessionKeyManager.setAllowSpends(false);

    const intent = await buildIntent();
    const signature = await signIntent(intent);

    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-session-denied"),
      /MERCH_Forbidden|revert/i,
    );
  });

  it("rejects when wallet epoch in intent is stale", async () => {
    const { portal, merchant, buildIntent, signIntent } = await deployFixture();

    const intent = await buildIntent({ walletEpoch: 0n });
    const signature = await signIntent(intent);

    await assert.rejects(
      () => portal.connect(merchant).payWithIntent(intent, signature, "order-stale-epoch"),
      /CBV_InvalidEpoch|revert/i,
    );
  });
});
