import { Contract, ContractFactory, JsonRpcProvider, parseUnits } from 'ethers';
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

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8570';
  const provider = new JsonRpcProvider(rpcUrl);

  const deployer = await provider.getSigner(0);
  const ownerA = await provider.getSigner(1);
  const ownerB = await provider.getSigner(2);
  const approver1 = await provider.getSigner(3);
  const approver2 = await provider.getSigner(4);
  const approver3 = await provider.getSigner(5);
  const recoveryTarget = await provider.getSigner(6);
  const dao = await provider.getSigner(9);

  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/CardBoundVaultVerifierMocks.sol/MockVFIDEForCardBound.json'
  );
  const hubArtifact = loadArtifact('artifacts/contracts/VaultHub.sol/VaultHub.json');
  const vaultArtifact = loadArtifact('artifacts/contracts/CardBoundVault.sol/CardBoundVault.json');

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, deployer);
  const hubFactory = new ContractFactory(hubArtifact.abi as any, hubArtifact.bytecode, deployer);

  currentStep = 'deploy-token';
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  currentStep = 'deploy-hub';
  const hub = (await hubFactory.deploy(
    await token.getAddress(),
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    await dao.getAddress()
  )) as any;
  await hub.waitForDeployment();

  currentStep = 'predict-and-create-vault-a';
  const ownerAAddr = await ownerA.getAddress();
  const predictedA = await hub.predictVault(ownerAAddr);
  await (await hub.connect(ownerA).ensureVault(ownerAAddr)).wait();
  const vaultAAddr = await hub.vaultOf(ownerAAddr);
  if (vaultAAddr !== predictedA) {
    throw new Error(`Vault A address mismatch, predicted ${predictedA} got ${vaultAAddr}`);
  }

  currentStep = 'idempotent-ensure-vault-a';
  await (await hub.connect(deployer).ensureVault(ownerAAddr)).wait();
  const vaultAAgain = await hub.vaultOf(ownerAAddr);
  if (vaultAAgain !== vaultAAddr) {
    throw new Error('ensureVault was not idempotent for owner A');
  }

  currentStep = 'create-vault-b';
  const ownerBAddr = await ownerB.getAddress();
  await (await hub.connect(ownerB).ensureVault(ownerBAddr)).wait();
  const vaultBAddr = await hub.vaultOf(ownerBAddr);
  if (vaultBAddr === '0x0000000000000000000000000000000000000000') {
    throw new Error('Vault B was not created');
  }

  currentStep = 'validate-cardbound-vault';
  const vaultA = new Contract(vaultAAddr, vaultArtifact.abi as any, provider) as any;
  const vaultAAsOwner = vaultA.connect(ownerA) as any;
  const name = await vaultA.NAME();
  if (name !== 'CardBoundVault') {
    throw new Error(`Expected CardBoundVault, got ${name}`);
  }

  currentStep = 'mint-and-transfer';
  await (await token.connect(deployer).mint(vaultAAddr, parseUnits('50', 18))).wait();
  await (await vaultAAsOwner.setGuardianThreshold(1)).wait();
  const chainId = (await provider.getNetwork()).chainId;
  const nonce = await vaultA.nextNonce();
  const epoch = await vaultA.walletEpoch();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const amount = parseUnits('5', 18);

  const signature = await ownerA.signTypedData(
    {
      name: 'CardBoundVault',
      version: '1',
      chainId,
      verifyingContract: vaultAAddr,
    } as any,
    {
      TransferIntent: [
        { name: 'vault', type: 'address' },
        { name: 'toVault', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'walletEpoch', type: 'uint64' },
        { name: 'deadline', type: 'uint64' },
        { name: 'chainId', type: 'uint256' },
      ],
    } as any,
    {
      vault: vaultAAddr,
      toVault: vaultBAddr,
      amount,
      nonce,
      walletEpoch: epoch,
      deadline,
      chainId,
    } as any
  );

  await (
    await vaultAAsOwner.executeVaultToVaultTransfer(
      {
        vault: vaultAAddr,
        toVault: vaultBAddr,
        amount,
        nonce,
        walletEpoch: epoch,
        deadline,
        chainId,
      },
      signature
    )
  ).wait();

  const vaultBBalance = await token.balanceOf(vaultBAddr);
  if (vaultBBalance !== amount) {
    throw new Error(`Expected transfer to vault B of ${amount}, got ${vaultBBalance}`);
  }

  currentStep = 'configure-approvers';
  await (await hub.setRecoveryApprover(await approver1.getAddress(), true)).wait();
  await (await hub.setRecoveryApprover(await approver2.getAddress(), true)).wait();
  await (await hub.setRecoveryApprover(await approver3.getAddress(), true)).wait();

  const targetOwner = await recoveryTarget.getAddress();

  currentStep = 'recovery-approvals';
  await (await hub.connect(approver1).approveForceRecovery(vaultAAddr, targetOwner)).wait();
  await (await hub.connect(approver2).approveForceRecovery(vaultAAddr, targetOwner)).wait();
  await (await hub.connect(approver3).approveForceRecovery(vaultAAddr, targetOwner)).wait();

  currentStep = 'early-finalize-reverts';
  await expectRevert(
    async () => {
      await hub.connect(dao).finalizeForceRecovery(vaultAAddr);
    },
    'Finalize unexpectedly succeeded before timelock'
  );

  currentStep = 'timelock-elapse';
  await provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 1]);
  await provider.send('evm_mine', []);

  currentStep = 'finalize-recovery';
  await (await hub.connect(dao).finalizeForceRecovery(vaultAAddr, { gasLimit: 5_000_000 })).wait();

  currentStep = 'assert-registry-updated';
  const oldMapping = await hub.vaultOf(ownerAAddr);
  if (oldMapping !== '0x0000000000000000000000000000000000000000') {
    throw new Error('Old owner still mapped to recovered vault');
  }
  const newMapping = await hub.vaultOf(targetOwner);
  if (newMapping !== vaultAAddr) {
    throw new Error('New owner not mapped to recovered vault');
  }
  const ownerOfVault = await hub.ownerOfVault(vaultAAddr);
  if (ownerOfVault !== targetOwner) {
    throw new Error('ownerOfVault was not updated after recovery');
  }

  currentStep = 'assert-vault-owner-state';
  const admin = await vaultA.admin();
  const activeWallet = await vaultA.activeWallet();
  const newEpoch = await vaultA.walletEpoch();

  if (admin !== targetOwner) {
    throw new Error('CardBoundVault admin not updated by force recovery');
  }
  if (activeWallet !== targetOwner) {
    throw new Error('CardBoundVault active wallet not updated by force recovery');
  }
  if (newEpoch !== epoch + 1n) {
    throw new Error('Wallet epoch did not increment during force recovery');
  }

  console.log('VaultHub CardBound integration verification passed');
}

main().catch((error) => {
  console.error(error);
  console.error(`Verifier failed at step: ${currentStep}`);
  process.exit(1);
});
