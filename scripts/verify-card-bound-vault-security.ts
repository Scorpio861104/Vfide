import { ContractFactory, JsonRpcProvider, Wallet, parseUnits } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let currentStep = 'init';

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
  };
}

async function expectRevert(fn: () => Promise<unknown>, message: string) {
  let reverted = false;
  try {
    await fn();
  } catch {
    reverted = true;
  }
  if (!reverted) {
    throw new Error(message);
  }
}

async function signIntent(
  wallet: Wallet,
  vaultAddress: string,
  toVault: string,
  amount: bigint,
  nonce: bigint,
  walletEpoch: bigint,
  deadline: bigint,
  chainId: bigint
) {
  const domain = {
    name: 'CardBoundVault',
    version: '1',
    chainId,
    verifyingContract: vaultAddress,
  };

  const types = {
    TransferIntent: [
      { name: 'vault', type: 'address' },
      { name: 'toVault', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'walletEpoch', type: 'uint64' },
      { name: 'deadline', type: 'uint64' },
      { name: 'chainId', type: 'uint256' },
    ],
  };

  const value = {
    vault: vaultAddress,
    toVault,
    amount,
    nonce,
    walletEpoch,
    deadline,
    chainId,
  };

  return wallet.signTypedData(domain as any, types as any, value as any);
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);

  const admin = await provider.getSigner(0);
  const walletA = new Wallet(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    provider
  );
  const walletANext = new Wallet(
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    provider
  );
  const guardian1 = await provider.getSigner(3);
  const guardian2 = await provider.getSigner(4);

  const registryArtifact = loadArtifact(
    'artifacts/contracts/mocks/CardBoundVaultVerifierMocks.sol/MockVaultRegistryForCardBound.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/CardBoundVaultVerifierMocks.sol/MockVFIDEForCardBound.json'
  );
  const vaultArtifact = loadArtifact('artifacts/contracts/CardBoundVault.sol/CardBoundVault.json');

  const registryFactory = new ContractFactory(registryArtifact.abi as any, registryArtifact.bytecode, admin);
  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, admin);
  const vaultFactory = new ContractFactory(vaultArtifact.abi as any, vaultArtifact.bytecode, admin);

  currentStep = 'deploy-registry';
  const registry = (await registryFactory.deploy()) as any;
  await registry.waitForDeployment();

  currentStep = 'deploy-token';
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  const guardians = [await guardian1.getAddress(), await guardian2.getAddress()];
  const maxPerTransfer = parseUnits('100', 18);
  const dailyLimit = parseUnits('150', 18);

  currentStep = 'deploy-vault-a';
  const vaultAContract = (await vaultFactory.deploy(
    await registry.getAddress(),
    await token.getAddress(),
    await admin.getAddress(),
    await walletA.getAddress(),
    guardians,
    2,
    maxPerTransfer,
    dailyLimit,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await vaultAContract.waitForDeployment();

  currentStep = 'deploy-vault-b';
  const vaultBContract = (await vaultFactory.deploy(
    await registry.getAddress(),
    await token.getAddress(),
    await admin.getAddress(),
    await walletA.getAddress(),
    guardians,
    2,
    maxPerTransfer,
    dailyLimit,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await vaultBContract.waitForDeployment();

  const vaultAAddress = await vaultAContract.getAddress();
  const vaultBAddress = await vaultBContract.getAddress();

  currentStep = 'set-vault-flags';
  await (await registry.setVault(vaultAAddress, true)).wait();
  await (await registry.setVault(vaultBAddress, true)).wait();

  currentStep = 'mint-vault-a';
  await (await token.mint(vaultAAddress, parseUnits('500', 18))).wait();

  const chainId = (await provider.getNetwork()).chainId;

  // 1) Valid vault-to-vault transfer signed by active wallet.
  currentStep = 'transfer-valid';
  const nonce0 = await vaultAContract.nextNonce();
  const epoch0 = await vaultAContract.walletEpoch();
  const deadline0 = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const amount50 = parseUnits('50', 18);

  const sig0 = await signIntent(
    walletA,
    vaultAAddress,
    vaultBAddress,
    amount50,
    nonce0,
    epoch0,
    deadline0,
    chainId
  );

  await (
    await vaultAContract.executeVaultToVaultTransfer(
      {
        vault: vaultAAddress,
        toVault: vaultBAddress,
        amount: amount50,
        nonce: nonce0,
        walletEpoch: epoch0,
        deadline: deadline0,
        chainId,
      },
      sig0
    )
  ).wait();

  const b1 = await token.balanceOf(vaultBAddress);
  if (b1 !== amount50) {
    throw new Error(`Expected vault B balance ${amount50}, got ${b1}`);
  }

  // 2) Replay must fail.
  currentStep = 'transfer-replay';
  await expectRevert(
    async () => {
      await vaultAContract.executeVaultToVaultTransfer(
        {
          vault: vaultAAddress,
          toVault: vaultBAddress,
          amount: amount50,
          nonce: nonce0,
          walletEpoch: epoch0,
          deadline: deadline0,
          chainId,
        },
        sig0
      );
    },
    'Replay transfer unexpectedly succeeded'
  );

  // 3) Destination must be a registered vault.
  currentStep = 'transfer-non-vault';
  const nonce1 = await vaultAContract.nextNonce();
  const deadline1 = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sigNonVault = await signIntent(
    walletA,
    vaultAAddress,
    await admin.getAddress(),
    parseUnits('10', 18),
    nonce1,
    epoch0,
    deadline1,
    chainId
  );

  await expectRevert(
    async () => {
      await vaultAContract.executeVaultToVaultTransfer(
        {
          vault: vaultAAddress,
          toVault: await admin.getAddress(),
          amount: parseUnits('10', 18),
          nonce: nonce1,
          walletEpoch: epoch0,
          deadline: deadline1,
          chainId,
        },
        sigNonVault
      );
    },
    'Transfer to non-vault unexpectedly succeeded'
  );

  // 4) Max per transfer enforcement.
  currentStep = 'transfer-over-limit';
  const nonce2 = await vaultAContract.nextNonce();
  const deadline2 = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const overMax = parseUnits('120', 18);
  const sigOverMax = await signIntent(
    walletA,
    vaultAAddress,
    vaultBAddress,
    overMax,
    nonce2,
    epoch0,
    deadline2,
    chainId
  );

  await expectRevert(
    async () => {
      await vaultAContract.executeVaultToVaultTransfer(
        {
          vault: vaultAAddress,
          toVault: vaultBAddress,
          amount: overMax,
          nonce: nonce2,
          walletEpoch: epoch0,
          deadline: deadline2,
          chainId,
        },
        sigOverMax
      );
    },
    'Over-limit transfer unexpectedly succeeded'
  );

  // 5) Pause blocks transfers.
  currentStep = 'pause-flow';
  await (await vaultAContract.connect(guardian1).pause()).wait();

  const nonce3 = await vaultAContract.nextNonce();
  const deadline3 = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sigPaused = await signIntent(
    walletA,
    vaultAAddress,
    vaultBAddress,
    parseUnits('10', 18),
    nonce3,
    epoch0,
    deadline3,
    chainId
  );

  await expectRevert(
    async () => {
      await vaultAContract.executeVaultToVaultTransfer(
        {
          vault: vaultAAddress,
          toVault: vaultBAddress,
          amount: parseUnits('10', 18),
          nonce: nonce3,
          walletEpoch: epoch0,
          deadline: deadline3,
          chainId,
        },
        sigPaused
      );
    },
    'Paused transfer unexpectedly succeeded'
  );

  await (await vaultAContract.unpause()).wait();

  // 6) Wallet rotation requires guardian quorum and delay.
  currentStep = 'rotation-propose-approve';
  await (await vaultAContract.proposeWalletRotation(await walletANext.getAddress(), 600)).wait();
  await (await vaultAContract.connect(guardian1).approveWalletRotation()).wait();
  await (await vaultAContract.connect(guardian2).approveWalletRotation()).wait();

  currentStep = 'rotation-early-finalize-revert';
  await expectRevert(
    async () => {
      await (await vaultAContract.finalizeWalletRotation({ gasLimit: 5_000_000 })).wait();
    },
    'Early wallet rotation finalize unexpectedly succeeded'
  );

  currentStep = 'rotation-finalize';
  await provider.send('evm_increaseTime', [601]);
  await provider.send('evm_mine', []);

  await (await vaultAContract.finalizeWalletRotation({ gasLimit: 5_000_000 })).wait();

  const epoch1 = await vaultAContract.walletEpoch();
  if (epoch1 !== epoch0 + 1n) {
    throw new Error('Wallet epoch did not increment after rotation');
  }

  // 7) Old wallet signatures must fail after epoch bump; new wallet must work.
  currentStep = 'post-rotation-signature-checks';
  const nonceAfterRotate = await vaultAContract.nextNonce();
  const deadline4 = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const oldSig = await signIntent(
    walletA,
    vaultAAddress,
    vaultBAddress,
    parseUnits('20', 18),
    nonceAfterRotate,
    epoch1,
    deadline4,
    chainId
  );

  await expectRevert(
    async () => {
      await vaultAContract.executeVaultToVaultTransfer(
        {
          vault: vaultAAddress,
          toVault: vaultBAddress,
          amount: parseUnits('20', 18),
          nonce: nonceAfterRotate,
          walletEpoch: epoch1,
          deadline: deadline4,
          chainId,
        },
        oldSig
      );
    },
    'Old wallet signature unexpectedly succeeded after rotation'
  );

  const newSig = await signIntent(
    walletANext,
    vaultAAddress,
    vaultBAddress,
    parseUnits('20', 18),
    nonceAfterRotate,
    epoch1,
    deadline4,
    chainId
  );

  await (
    await vaultAContract.executeVaultToVaultTransfer(
      {
        vault: vaultAAddress,
        toVault: vaultBAddress,
        amount: parseUnits('20', 18),
        nonce: nonceAfterRotate,
        walletEpoch: epoch1,
        deadline: deadline4,
        chainId,
      },
      newSig
    )
  ).wait();

  const finalBalanceB = await token.balanceOf(vaultBAddress);
  if (finalBalanceB !== parseUnits('70', 18)) {
    throw new Error(`Expected final vault B balance 70 tokens, got ${finalBalanceB}`);
  }

  console.log('CardBoundVault security verification passed');
}

main().catch((error) => {
  console.error(error);
  console.error(`Verifier failed at step: ${currentStep}`);
  process.exit(1);
});
