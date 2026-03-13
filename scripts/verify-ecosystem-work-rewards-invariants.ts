import { ContractFactory, JsonRpcProvider } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
  };
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
  const provider = new JsonRpcProvider(rpcUrl);

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
  const vaultArtifact = loadArtifact('artifacts/contracts/EcosystemVault.sol/EcosystemVault.json');

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, owner);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, owner);
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  const vaultFactory = new ContractFactory(vaultArtifact.abi as any, vaultArtifact.bytecode, owner);
  const vault = (await vaultFactory.deploy(
    await token.getAddress(),
    await seer.getAddress(),
    ownerAddress
  )) as any;
  await vault.waitForDeployment();

  const one = 1_000_000_000_000_000_000n;
  await (await token.mint(await vault.getAddress(), 1_000n * one)).wait();

  await (await vault.allocateIncoming()).wait();

  const initialMerchantPool = await vault.merchantPool();
  const initialHeadhunterPool = await vault.headhunterPool();
  const initialOperationsPool = await vault.operationsPool();

  await (await vault.payExpense(expenseRecipientAddress, 200n * one, 'ops_expense')).wait();

  const merchantAfterExpense = await vault.merchantPool();
  const headhunterAfterExpense = await vault.headhunterPool();
  const operationsAfterExpense = await vault.operationsPool();

  if (
    merchantAfterExpense !== initialMerchantPool ||
    headhunterAfterExpense !== initialHeadhunterPool
  ) {
    throw new Error('payExpense must not debit merchant/headhunter pools');
  }

  if (operationsAfterExpense !== initialOperationsPool - 200n * one) {
    throw new Error('payExpense did not debit operations pool by expected amount');
  }

  const expensesTotal = await vault.totalExpensesPaid();
  if (expensesTotal !== 200n * one) {
    throw new Error(`Expected totalExpensesPaid=200e18, got ${expensesTotal}`);
  }

  await expectRevert(() =>
    vault.payExpense(expenseRecipientAddress, operationsAfterExpense + one, 'too_much')
  );

  await (await vault.burnFunds(50n * one)).wait();
  const burnTotal = await vault.totalBurned();
  if (burnTotal !== 50n * one) {
    throw new Error(`Expected totalBurned=50e18, got ${burnTotal}`);
  }

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

  const pending = (await vault.getPendingReferral(userAddress)) as readonly [
    string,
    string,
    boolean,
  ];
  if (pending[2] !== true) {
    throw new Error('Expected referral to be marked credited');
  }

  const health = (await vault.getVaultHealth()) as readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ];
  if (health[1] < health[2]) {
    throw new Error('Vault health invariant violated: totalIn must be >= totalOut');
  }

  const pools = (await vault.getPoolBalances()) as readonly [bigint, bigint, bigint, bigint];
  if (pools[3] === 0n) {
    throw new Error('Expected non-zero vault balance after invariant flow');
  }

  console.log('Ecosystem work-reward invariant checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
