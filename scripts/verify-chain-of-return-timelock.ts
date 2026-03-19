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

async function increaseTime(provider: JsonRpcProvider, seconds: number) {
  await provider.send('evm_increaseTime', [seconds]);
  await provider.send('evm_mine', []);
}

async function expectRevert(action: () => Promise<unknown>) {
  try {
    const tx = await action();
    if (typeof tx === 'object' && tx !== null && 'wait' in tx) {
      await (tx as { wait: () => Promise<unknown> }).wait();
    }
    throw new Error('Expected transaction to revert but it succeeded');
  } catch (error) {
    const text = String(error);
    if (text.includes('Expected transaction to revert but it succeeded')) {
      throw error;
    }
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);

  const owner = await provider.getSigner(0);
  const proposedOwner = await provider.getSigner(1);
  const guardian = await provider.getSigner(2);
  const guardian2 = await provider.getSigner(3);

  const vaultArtifact = loadArtifact('artifacts/contracts/UserVault.sol/UserVault.json');
  const vaultFactory = new ContractFactory(vaultArtifact.abi as any, vaultArtifact.bytecode, owner);

  const ownerAddress = await owner.getAddress();
  const proposedOwnerAddress = await proposedOwner.getAddress();
  const guardianAddress = await guardian.getAddress();
  const guardian2Address = await guardian2.getAddress();

  const oneDay = 24 * 60 * 60;
  const sevenDays = 7 * oneDay;

  // Case: Recovery requires at least 2 guardians, majority approval, and timelock.
  const vaultA = (await vaultFactory.deploy(
    ownerAddress,
    ownerAddress,
    ownerAddress,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await vaultA.waitForDeployment();

  await (await vaultA.setGuardian(guardianAddress, true)).wait();
  await (await vaultA.setGuardian(guardian2Address, true)).wait();
  await increaseTime(provider, sevenDays + 1);
  await (await vaultA.connect(guardian).requestRecovery(proposedOwnerAddress)).wait();

  const statusA = (await vaultA.getRecoveryStatus()) as [string, bigint, bigint, bigint, boolean];
  if (!statusA[4]) throw new Error('Expected active recovery');
  if (statusA[1] !== 1n) throw new Error(`Expected approvals=1 after request, got ${statusA[1]}`);

  await expectRevert(() => vaultA.finalizeRecovery({ gasLimit: 5_000_000 }));

  await (await vaultA.connect(guardian2).guardianApproveRecovery()).wait();

  const statusA2 = (await vaultA.getRecoveryStatus()) as [string, bigint, bigint, bigint, boolean];
  if (statusA2[1] !== 2n)
    throw new Error(`Expected approvals=2 after second guardian, got ${statusA2[1]}`);

  await increaseTime(provider, sevenDays + 1);
  await (await vaultA.finalizeRecovery()).wait();

  const finalOwnerA = await vaultA.owner();
  if (finalOwnerA.toLowerCase() !== proposedOwnerAddress.toLowerCase()) {
    throw new Error('Recovery flow failed: owner did not update after threshold + timelock');
  }

  console.log('Chain of Return timelock checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
