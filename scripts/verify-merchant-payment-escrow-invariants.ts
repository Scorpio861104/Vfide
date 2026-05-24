import { ContractFactory, FetchRequest, JsonRpcProvider } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
    linkReferences?: Record<string, Record<string, Array<{ start: number; length: number }>>>;
  };
}

async function expectRevert(action: () => Promise<any>, label: string) {
  try {
    await action();
    throw new Error(`Expected revert for: ${label}`);
  } catch (err: any) {
    if (err?.message?.startsWith('Expected revert')) throw err;
    // Reverted as expected — any revert reason is acceptable
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const request = new FetchRequest(rpcUrl);
  request.timeout = 180_000;
  const provider = new JsonRpcProvider(request);

  const dao = await provider.getSigner(0);
  const merchant = await provider.getSigner(1);
  const customer = await provider.getSigner(2);
  const attacker = await provider.getSigner(3);

  const daoAddress = await dao.getAddress();
  const merchantAddress = await merchant.getAddress();
  const customerAddress = await customer.getAddress();

  // Load artifacts (compiled during the CI compile step before this script runs)
  const seerArtifact = loadArtifact(
    'artifacts/contracts/mocks/CommerceEscrowVerifierMocks.sol/MockSeerForEscrow.json'
  );
  const vaultHubArtifact = loadArtifact(
    'artifacts/contracts/mocks/CommerceEscrowVerifierMocks.sol/MockVaultHubForEscrow.json'
  );
  const ledgerArtifact = loadArtifact(
    'artifacts/contracts/mocks/CommerceEscrowVerifierMocks.sol/MockLedgerForEscrow.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/CommerceEscrowVerifierMocks.sol/MockTokenForEscrow.json'
  );
  const portalArtifact = loadArtifact(
    'artifacts/contracts/MerchantPortal.sol/MerchantPortal.json'
  );

  // Deploy mock seer (full ISeer stub — returns 0 for minForMerchant so portal uses its own floor)
  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();

  // Set merchant score well above any threshold
  await (await seer.setScore(merchantAddress, 9000)).wait();

  // Deploy mock vaultHub
  const vaultHubFactory = new ContractFactory(
    vaultHubArtifact.abi as any,
    vaultHubArtifact.bytecode,
    dao
  );
  const vaultHub = (await vaultHubFactory.deploy()) as any;
  await vaultHub.waitForDeployment();

  // Deploy mock ledger
  const ledgerFactory = new ContractFactory(
    ledgerArtifact.abi as any,
    ledgerArtifact.bytecode,
    dao
  );
  const ledger = (await ledgerFactory.deploy()) as any;
  await ledger.waitForDeployment();

  // Deploy mock token
  const tokenFactory = new ContractFactory(
    tokenArtifact.abi as any,
    tokenArtifact.bytecode,
    dao
  );
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  // Mint tokens to customer
  const mintAmount = 1_000_000n * 10n ** 18n;
  await (await token.mint(customerAddress, mintAmount)).wait();

  // Deploy MerchantPortal with proper mocks
  const portalFactory = new ContractFactory(
    portalArtifact.abi as any,
    portalArtifact.bytecode,
    dao
  );
  const portal = (await portalFactory.deploy(
    daoAddress,
    await vaultHub.getAddress(),
    await seer.getAddress(),
    await ledger.getAddress(),
    daoAddress // feeSink = dao address (non-zero, valid)
  )) as any;
  await portal.waitForDeployment();

  console.log('✓ MerchantPortal deployed at', await portal.getAddress());

  // ── INV-01: Unregistered merchant cannot process payment ──────────────────
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, 100n * 10n ** 18n, 'order-001'),
    'INV-01: unregistered merchant'
  );
  console.log('✓ INV-01: Unregistered merchant cannot process payment');

  // Register merchant (score 9000 passes any threshold)
  await (await portal.connect(merchant).registerMerchant('Test Merchant', 'retail')).wait();
  console.log('✓ Merchant registered successfully');

  // ── INV-02: Payment without customer approval reverts ─────────────────────
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, 100n * 10n ** 18n, 'order-002'),
    'INV-02: no approval'
  );
  console.log('✓ INV-02: Payment without customer approval reverts');

  // Grant pull permit to merchant
  const pullLimit = 500n * 10n ** 18n;
  const noExpiry = 0n;
  await (
    await portal.connect(customer).setMerchantPullPermit(merchantAddress, pullLimit, noExpiry)
  ).wait();

  // ── INV-03: Over-limit payment reverts ────────────────────────────────────
  const overLimit = pullLimit + 1n;
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, overLimit, 'order-003'),
    'INV-03: over limit'
  );
  console.log('✓ INV-03: Over-limit payment reverts (pull limit enforced)');

  // ── INV-04: Expired permit is rejected ────────────────────────────────────
  const latestBlock = await provider.getBlock('latest');
  const pastExpiry = BigInt((latestBlock?.timestamp ?? 0) - 1);
  await (
    await portal
      .connect(customer)
      .setMerchantPullPermit(merchantAddress, pullLimit, pastExpiry)
  ).wait();
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, 10n * 10n ** 18n, 'order-004'),
    'INV-04: expired permit'
  );
  console.log('✓ INV-04: Expired permit is rejected');

  // Reset to valid non-expiring permit
  await (
    await portal.connect(customer).setMerchantPullPermit(merchantAddress, pullLimit, noExpiry)
  ).wait();

  // ── INV-05: Revoke zeroes remaining pull limit ────────────────────────────
  await (
    await portal.connect(customer).setMerchantPullApproval(merchantAddress, false)
  ).wait();
  const remainingAfterRevoke = await portal.merchantPullRemaining(
    customerAddress,
    merchantAddress
  );
  if (remainingAfterRevoke !== 0n) {
    throw new Error(
      `INV-05 FAIL: Expected remaining=0 after revoke, got ${remainingAfterRevoke}`
    );
  }
  console.log('✓ INV-05: Revoke zeroes remaining pull limit');

  // ── INV-06: setMerchantPullApproval cannot grant (M-12 protection) ────────
  await expectRevert(
    () => portal.connect(customer).setMerchantPullApproval(merchantAddress, true),
    'INV-06: direct grant blocked'
  );
  console.log('✓ INV-06: setMerchantPullApproval cannot grant (M-12 protection)');

  // ── INV-07: Token-scoped permit rejects mismatched token ──────────────────
  const token2 = (await tokenFactory.deploy()) as any;
  await token2.waitForDeployment();
  const token2Address = await token2.getAddress();

  await (
    await portal
      .connect(customer)
      .setMerchantPullPermitForToken(merchantAddress, tokenAddress, pullLimit, noExpiry)
  ).wait();
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, token2Address, 10n * 10n ** 18n, 'order-007'),
    'INV-07: wrong token'
  );
  console.log('✓ INV-07: Token-scoped permit rejects mismatched token');

  // ── INV-08: Non-merchant cannot call processPayment ───────────────────────
  await expectRevert(
    () =>
      portal
        .connect(attacker)
        .processPayment(customerAddress, tokenAddress, 10n * 10n ** 18n, 'order-008'),
    'INV-08: non-merchant blocked'
  );
  console.log('✓ INV-08: Non-merchant cannot call processPayment');

  console.log('\n✅ All merchant payment escrow invariants verified.');
}

main().catch((err) => {
  console.error('❌ Invariant check failed:', err.message ?? err);
  process.exit(1);
});
