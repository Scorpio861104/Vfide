import { ContractFactory, FetchRequest, JsonRpcProvider, ZeroAddress } from 'ethers';
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
    // Reverted as expected
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

  // Load artifacts (compiled by hardhat compile in CI before this script runs)
  const seerArtifact = loadArtifact(
    'artifacts/contracts/mocks/CommerceEscrowVerifierMocks.sol/MockSeerForEscrow.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/CommerceEscrowVerifierMocks.sol/MockTokenForEscrow.json'
  );
  const portalArtifact = loadArtifact(
    'artifacts/contracts/MerchantPortal.sol/MerchantPortal.json'
  );

  // Deploy mock seer
  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();

  // Set merchant score above minimum threshold (min is typically 3000)
  await (await seer.setScore(merchantAddress, 7000)).wait();

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

  // Deploy placeholder contracts for vaultHub, ledger, feeSink
  // Use token contract address as a minimal placeholder (has code, non-zero)
  const placeholderAddress = await token.getAddress();

  // Deploy MerchantPortal
  const portalFactory = new ContractFactory(
    portalArtifact.abi as any,
    portalArtifact.bytecode,
    dao
  );
  const portal = (await portalFactory.deploy(
    daoAddress,
    placeholderAddress, // vaultHub
    await seer.getAddress(),
    placeholderAddress, // ledger
    placeholderAddress // feeSink
  )) as any;
  await portal.waitForDeployment();

  console.log('✓ MerchantPortal deployed at', await portal.getAddress());

  // ── Invariant 1: Unregistered merchant cannot process payment ──────────────
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, 100n * 10n ** 18n, 'order-001'),
    'unregistered merchant payment'
  );
  console.log('✓ INV-01: Unregistered merchant cannot process payment');

  // Register merchant
  await (await portal.connect(merchant).registerMerchant('Test Merchant', 'retail')).wait();

  // ── Invariant 2: Payment without customer approval reverts ─────────────────
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, 100n * 10n ** 18n, 'order-002'),
    'payment without approval'
  );
  console.log('✓ INV-02: Payment without customer approval reverts');

  // Grant pull permit to merchant
  const pullLimit = 500n * 10n ** 18n;
  const noExpiry = 0n;
  await (
    await portal.connect(customer).setMerchantPullPermit(merchantAddress, pullLimit, noExpiry)
  ).wait();

  // ── Invariant 3: Pull respects the limit — over-limit payment reverts ──────
  const overLimit = pullLimit + 1n;
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, tokenAddress, overLimit, 'order-003'),
    'over-limit payment'
  );
  console.log('✓ INV-03: Over-limit payment reverts (pull limit enforced)');

  // ── Invariant 4: Expired permit is rejected ────────────────────────────────
  // Set a permit that expires in the past (1 second ago via block manipulation)
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
    'expired permit'
  );
  console.log('✓ INV-04: Expired permit is rejected');

  // Reset to valid non-expiring permit
  await (
    await portal.connect(customer).setMerchantPullPermit(merchantAddress, pullLimit, noExpiry)
  ).wait();

  // ── Invariant 5: Revoke approval zeroes remaining limit ────────────────────
  await (await portal.connect(customer).setMerchantPullApproval(merchantAddress, false)).wait();
  const remainingAfterRevoke = await portal.merchantPullRemaining(customerAddress, merchantAddress);
  if (remainingAfterRevoke !== 0n) {
    throw new Error(
      `INV-05 FAIL: Expected remaining=0 after revoke, got ${remainingAfterRevoke}`
    );
  }
  console.log('✓ INV-05: Revoke zeroes remaining pull limit');

  // ── Invariant 6: setMerchantPullApproval cannot grant (approved=true reverts) ──
  await expectRevert(
    () => portal.connect(customer).setMerchantPullApproval(merchantAddress, true),
    'direct approval grant blocked'
  );
  console.log('✓ INV-06: setMerchantPullApproval cannot grant (M-12 protection)');

  // ── Invariant 7: Token-scoped permit enforces token match ─────────────────
  // Deploy a second token
  const token2 = (await tokenFactory.deploy()) as any;
  await token2.waitForDeployment();
  const token2Address = await token2.getAddress();

  await (
    await portal
      .connect(customer)
      .setMerchantPullPermitForToken(merchantAddress, tokenAddress, pullLimit, noExpiry)
  ).wait();

  // Attempt payment with wrong token — should revert
  await expectRevert(
    () =>
      portal
        .connect(merchant)
        .processPayment(customerAddress, token2Address, 10n * 10n ** 18n, 'order-007'),
    'wrong token in scoped permit'
  );
  console.log('✓ INV-07: Token-scoped permit rejects mismatched token');

  // ── Invariant 8: Non-merchant cannot call processPayment ──────────────────
  await expectRevert(
    () =>
      portal
        .connect(attacker)
        .processPayment(customerAddress, tokenAddress, 10n * 10n ** 18n, 'order-008'),
    'non-merchant processPayment'
  );
  console.log('✓ INV-08: Non-merchant cannot call processPayment');

  console.log('\n✅ All merchant payment escrow invariants verified.');
}

main().catch((err) => {
  console.error('❌ Invariant check failed:', err.message ?? err);
  process.exit(1);
});
