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

function linkBytecode(
  bytecode: string,
  linkReferences: Record<string, Record<string, Array<{ start: number; length: number }>>> | undefined,
  libraries: Record<string, string>
) {
  if (!linkReferences) {
    return bytecode;
  }

  let linkedBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;

  for (const [, fileReferences] of Object.entries(linkReferences)) {
    for (const [libraryName, references] of Object.entries(fileReferences)) {
      const address = libraries[libraryName];
      if (!address) {
        throw new Error(`Missing linked library address for ${libraryName}`);
      }

      const normalizedAddress = address.toLowerCase().replace(/^0x/, '');
      for (const { start, length } of references) {
        const startIndex = start * 2;
        const endIndex = startIndex + length * 2;
        linkedBytecode =
          linkedBytecode.slice(0, startIndex) +
          normalizedAddress +
          linkedBytecode.slice(endIndex);
      }
    }
  }

  return `0x${linkedBytecode}`;
}

async function expectRevert(action: () => Promise<any>) {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error('Expected transaction to revert');
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const request = new FetchRequest(rpcUrl);
  request.timeout = 180_000;
  const provider = new JsonRpcProvider(request);

  const owner = await provider.getSigner(0);
  const merchant = await provider.getSigner(1);
  const referrer = await provider.getSigner(2);
  const user = await provider.getSigner(3);
  const expenseRecipient = await provider.getSigner(4);

  const ownerAddress = await owner.getAddress();
  const merchantAddress = await merchant.getAddress();
  const referrerAddress = await referrer.getAddress();
  const userAddress = await user.getAddress();
  const expenseRecipientAddress = await expenseRecipient.getAddress();

  const seerArtifact = loadArtifact(
    'artifacts/contracts/mocks/EcosystemWorkRewardsVerifierMocks.sol/MockSeerForEcosystem.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/EcosystemWorkRewardsVerifierMocks.sol/MockTokenForEcosystem.json'
  );
  const vaultHubArtifact = loadArtifact(
    'artifacts/contracts/mocks/EcosystemWorkRewardsVerifierMocks.sol/MockVaultHubForEcosystem.json'
  );
  const vaultLibArtifact = loadArtifact(
    'artifacts/contracts/EcosystemVaultLib.sol/EcosystemVaultLib.json'
  );
  const vaultArtifact = loadArtifact('artifacts/contracts/EcosystemVault.sol/EcosystemVault.json');

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, owner);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, owner);
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  const vaultHubFactory = new ContractFactory(
    vaultHubArtifact.abi as any,
    vaultHubArtifact.bytecode,
    owner
  );
  const vaultHub = (await vaultHubFactory.deploy()) as any;
  await vaultHub.waitForDeployment();

  const vaultLibFactory = new ContractFactory(
    vaultLibArtifact.abi as any,
    vaultLibArtifact.bytecode,
    owner
  );
  const vaultLib = (await vaultLibFactory.deploy()) as any;
  await vaultLib.waitForDeployment();

  const linkedVaultBytecode = linkBytecode(vaultArtifact.bytecode, vaultArtifact.linkReferences, {
    EcosystemVaultLib: await vaultLib.getAddress(),
  });
  const vaultFactory = new ContractFactory(vaultArtifact.abi as any, linkedVaultBytecode, owner);
  const vault = (await vaultFactory.deploy(
    await token.getAddress(),
    await seer.getAddress(),
    ownerAddress
  )) as any;
  await vault.waitForDeployment();

  const one = 1_000_000_000_000_000_000n;
  await (await token.mint(await vault.getAddress(), 1_000n * one)).wait();
  await (await token.mint(ownerAddress, 10n * one)).wait();
  await (await vault.configureAutoSwap('0x0000000000000000000000000000000000000000', await token.getAddress(), false, 0)).wait();
  await (await vault.setReferralVaultHub(await vaultHub.getAddress())).wait();
  await (await token.approve(await vault.getAddress(), 10n * one)).wait();
  await (await vault.depositStablecoinReserve(await token.getAddress(), 10n * one)).wait();
  await (await vaultHub.setVault(userAddress, userAddress)).wait();
  await (await token.mint(userAddress, 25n * one)).wait();

  await (await vault.allocateIncoming()).wait();

  const initialMerchantPool = await vault.merchantPool();
  const initialHeadhunterPool = await vault.headhunterPool();
  const initialOperationsPool = await vault.operationsPool();

  await (await vault.payExpense(expenseRecipientAddress, 50n * one, 'ops_expense')).wait();

  const merchantAfterExpense = await vault.merchantPool();
  const headhunterAfterExpense = await vault.headhunterPool();
  const operationsAfterExpense = await vault.operationsPool();

  if (
    merchantAfterExpense !== initialMerchantPool ||
    headhunterAfterExpense !== initialHeadhunterPool
  ) {
    throw new Error('payExpense must not debit merchant/headhunter pools');
  }

  if (operationsAfterExpense !== initialOperationsPool - 50n * one) {
    throw new Error('payExpense did not debit operations pool by expected amount');
  }

  const expensesTotal = await vault.totalExpensesPaid();
  if (expensesTotal !== 50n * one) {
    throw new Error(`Expected totalExpensesPaid=50e18, got ${expensesTotal}`);
  }

  await expectRevert(() =>
    vault.payExpense(expenseRecipientAddress, operationsAfterExpense + one, 'too_much')
  );

  // burnFunds() removed from EcosystemVault (soul commitment — no secondary burn pathway).
  // Burn verification is handled via ProofScoreBurnRouter in the token-level invariant suite.

  await (await vault.configureAutoWorkPayout(true, 2n * one, 3n * one, one)).wait();

  await (await seer.setScore(merchantAddress, 8500)).wait();
  await (await vault.recordMerchantTransaction(merchantAddress)).wait();

  const merchantTxCount = await vault.periodMerchantTxCount(1, merchantAddress);
  if (merchantTxCount !== 1n) {
    throw new Error(`Expected merchant tx count 1, got ${merchantTxCount}`);
  }

  const merchantPaidTotal = await vault.totalMerchantBonusPaid();
  if (merchantPaidTotal !== 2n * one) {
    throw new Error(
      `Expected totalMerchantBonusPaid=2e18 after auto merchant tx payout, got ${merchantPaidTotal}`
    );
  }

  await (await seer.setScore(referrerAddress, 7000)).wait();
  await (await vault.registerUserReferral(referrerAddress, userAddress)).wait();
  await (await vault.creditUserReferral(userAddress)).wait();

  const referralPaidTotal = await vault.totalHeadhunterPaid();
  if (referralPaidTotal !== one) {
    throw new Error(
      `Expected totalHeadhunterPaid=1e18 after user referral payout, got ${referralPaidTotal}`
    );
  }

  const pendingReferrer = await vault.pendingUserReferrer(userAddress);
  if (pendingReferrer !== referrerAddress) {
    throw new Error(`Expected pendingUserReferrer to remain ${referrerAddress}, got ${pendingReferrer}`);
  }

  const credited = await vault.referralCredited(userAddress);
  if (credited !== true) {
    throw new Error('Expected referral to be marked credited');
  }

  const totalReceived = await vault.totalReceived();
  const totalOut =
    (await vault.totalCouncilPaid()) +
    (await vault.totalMerchantBonusPaid()) +
    (await vault.totalHeadhunterPaid()) +
    (await vault.totalExpensesPaid());
    // totalBurned() removed — EcosystemVault is not a burn pathway (soul commitment).
  if (totalReceived < totalOut) {
    throw new Error('Vault health invariant violated: totalIn must be >= totalOut');
  }

  const vaultBalance = await token.balanceOf(await vault.getAddress());
  if (vaultBalance === 0n) {
    throw new Error('Expected non-zero vault balance after invariant flow');
  }

  console.log('Ecosystem work-reward invariant checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
