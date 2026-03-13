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
  const kin = await provider.getSigner(1);
  const guardian = await provider.getSigner(2);
  const guardian2 = await provider.getSigner(3);

  const ownerAddress = await owner.getAddress();
  const kinAddress = await kin.getAddress();
  const guardianAddress = await guardian.getAddress();
  const guardian2Address = await guardian2.getAddress();

  const vfideArtifact = loadArtifact(
    'artifacts/contracts/mocks/NextOfKinInheritanceVerifierMocks.sol/MockVFIDEForInheritance.json'
  );
  const hubArtifact = loadArtifact(
    'artifacts/contracts/mocks/NextOfKinInheritanceVerifierMocks.sol/MockVaultHubForInheritance.json'
  );
  const vaultArtifact = loadArtifact('artifacts/contracts/UserVault.sol/UserVault.json');

  const vfideFactory = new ContractFactory(vfideArtifact.abi as any, vfideArtifact.bytecode, owner);
  const vfide = (await vfideFactory.deploy()) as any;
  await vfide.waitForDeployment();

  const hubFactory = new ContractFactory(hubArtifact.abi as any, hubArtifact.bytecode, owner);
  const hub = (await hubFactory.deploy()) as any;
  await hub.waitForDeployment();

  const vaultFactory = new ContractFactory(vaultArtifact.abi as any, vaultArtifact.bytecode, owner);
  const vault = (await vaultFactory.deploy(
    await hub.getAddress(),
    await vfide.getAddress(),
    ownerAddress,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await vault.waitForDeployment();

  // Simulate that Next of Kin already has an existing vault in hub.
  const kinVault = (await vaultFactory.deploy(
    await hub.getAddress(),
    await vfide.getAddress(),
    kinAddress,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await kinVault.waitForDeployment();
  await (await hub.setVault(kinAddress, await kinVault.getAddress())).wait();

  // Fund inheritable balance.
  const oneToken = 1_000_000_000_000_000_000n;
  await (await vfide.mint(await vault.getAddress(), 100n * oneToken)).wait();

  // Configure guardians and next of kin.
  await (await vault.setGuardian(guardianAddress, true)).wait();
  await (await vault.setGuardian(guardian2Address, true)).wait();
  await (await vault.setNextOfKin(kinAddress)).wait();

  // Mature guardians so inheritance approval is valid.
  await increaseTime(provider, 7 * 24 * 60 * 60 + 1);

  // Next of Kin initiates inheritance.
  await (await vault.connect(kin).requestInheritance()).wait();

  // While inheritance is active, guardian set changes must be blocked.
  await expectRevert(() => vault.setGuardian(ownerAddress, true));
  await expectRevert(async () =>
    vault.transferVFIDE(await kinVault.getAddress(), oneToken, { gasLimit: 6_000_000 })
  );

  // Need 2 approvals because snapshot was 2 guardians.
  await (await vault.connect(guardian).approveInheritance()).wait();
  await (await vault.connect(guardian2).approveInheritance()).wait();

  // Even with approvals, timelock must block early finalization.
  await expectRevert(() => vault.connect(kin).finalizeInheritance({ gasLimit: 6_000_000 }));

  await increaseTime(provider, 7 * 24 * 60 * 60 + 1);
  await (await vault.connect(kin).finalizeInheritance()).wait();

  const kinVaultBalance = await vfide.balanceOf(await kinVault.getAddress());
  if (kinVaultBalance !== 100n * oneToken) {
    throw new Error(`Expected inherited funds in kin vault, got ${kinVaultBalance}`);
  }

  // Recovery-claim lock check: owner transfers must be blocked during active recovery.
  const vaultR = (await vaultFactory.deploy(
    await hub.getAddress(),
    await vfide.getAddress(),
    ownerAddress,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await vaultR.waitForDeployment();
  await (await vfide.mint(await vaultR.getAddress(), 10n * oneToken)).wait();
  await (await vaultR.setGuardian(guardianAddress, true)).wait();
  await increaseTime(provider, 7 * 24 * 60 * 60 + 1);
  await (await vaultR.connect(guardian).requestRecovery(kinAddress)).wait();
  await expectRevert(async () =>
    vaultR.transferVFIDE(await kinVault.getAddress(), oneToken, { gasLimit: 6_000_000 })
  );

  console.log('Next of Kin inheritance checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
