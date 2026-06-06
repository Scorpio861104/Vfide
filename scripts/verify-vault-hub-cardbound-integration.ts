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

async function chainDeadline(provider: JsonRpcProvider, offsetSeconds = 3600): Promise<bigint> {
  const latest = await provider.getBlock('latest');
  if (!latest) {
    throw new Error('Unable to read latest block for deadline calculation');
  }
  return BigInt(latest.timestamp + offsetSeconds);
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);

  const deployer = await provider.getSigner(0);
  const ownerA = await provider.getSigner(1);
  const ownerB = await provider.getSigner(2);
  const approver1 = await provider.getSigner(3);
  const approver2 = await provider.getSigner(4);
  const dao = await provider.getSigner(9);

  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/CardBoundVaultVerifierMocks.sol/MockVFIDEForCardBound.json'
  );
  const hubArtifact = loadArtifact('artifacts/contracts/VaultHub.sol/VaultHub.json');
  const vaultArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVault.sol/CardBoundVault.json'
  );
  const initCodeChunkArtifacts = [0, 1, 2, 3].map((idx) =>
    loadArtifact(
      `artifacts/contracts/vault/CardBoundVaultInitCodeChunk${idx}.sol/CardBoundVaultInitCodeChunk${idx}.json`
    )
  );
  const initCodeStoreArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultInitCodeStore.sol/CardBoundVaultInitCodeStore.json'
  );
  const vaultDeployerArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultDeployer.sol/CardBoundVaultDeployer.json'
  );
  const intentValidatorArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultIntentValidator.sol/CardBoundVaultIntentValidator.json'
  );
  const paymentQueueManagerArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultPaymentQueueManager.sol/CardBoundVaultPaymentQueueManager.json'
  );
  const withdrawalQueueManagerArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultWithdrawalQueueManager.sol/CardBoundVaultWithdrawalQueueManager.json'
  );
  const inheritanceManagerArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultInheritanceManager.sol/CardBoundVaultInheritanceManager.json'
  );
  const adminManagerArtifact = loadArtifact(
    'artifacts/contracts/vault/CardBoundVaultAdminManager.sol/CardBoundVaultAdminManager.json'
  );

  const tokenFactory = new ContractFactory(
    tokenArtifact.abi as any,
    tokenArtifact.bytecode,
    deployer
  );
  const hubFactory = new ContractFactory(hubArtifact.abi as any, hubArtifact.bytecode, deployer);
  const initCodeChunkFactories = initCodeChunkArtifacts.map(
    (artifact) => new ContractFactory(artifact.abi as any, artifact.bytecode, deployer)
  );
  const initCodeStoreFactory = new ContractFactory(
    initCodeStoreArtifact.abi as any,
    initCodeStoreArtifact.bytecode,
    deployer
  );
  const vaultDeployerFactory = new ContractFactory(
    vaultDeployerArtifact.abi as any,
    vaultDeployerArtifact.bytecode,
    deployer
  );
  const intentValidatorFactory = new ContractFactory(
    intentValidatorArtifact.abi as any,
    intentValidatorArtifact.bytecode,
    deployer
  );
  const paymentQueueManagerFactory = new ContractFactory(
    paymentQueueManagerArtifact.abi as any,
    paymentQueueManagerArtifact.bytecode,
    deployer
  );
  const withdrawalQueueManagerFactory = new ContractFactory(
    withdrawalQueueManagerArtifact.abi as any,
    withdrawalQueueManagerArtifact.bytecode,
    deployer
  );
  const inheritanceManagerFactory = new ContractFactory(
    inheritanceManagerArtifact.abi as any,
    inheritanceManagerArtifact.bytecode,
    deployer
  );
  const adminManagerFactory = new ContractFactory(
    adminManagerArtifact.abi as any,
    adminManagerArtifact.bytecode,
    deployer
  );

  currentStep = 'deploy-token';
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  currentStep = 'deploy-vault-dependency-graph';
  const initCodeChunks = [];
  for (const factory of initCodeChunkFactories) {
    const chunk = (await factory.deploy()) as any;
    await chunk.waitForDeployment();
    initCodeChunks.push(chunk);
  }
  const initCodeStore = (await initCodeStoreFactory.deploy(
    await initCodeChunks[0].getAddress(),
    await initCodeChunks[1].getAddress(),
    await initCodeChunks[2].getAddress(),
    await initCodeChunks[3].getAddress()
  )) as any;
  await initCodeStore.waitForDeployment();
  const vaultDeployer = (await vaultDeployerFactory.deploy(
    await initCodeStore.getAddress()
  )) as any;
  await vaultDeployer.waitForDeployment();
  const intentValidator = (await intentValidatorFactory.deploy()) as any;
  await intentValidator.waitForDeployment();
  const paymentQueueManagerImplementation = (await paymentQueueManagerFactory.deploy(
    '0x0000000000000000000000000000000000000000',
    0
  )) as any;
  await paymentQueueManagerImplementation.waitForDeployment();
  const withdrawalQueueManagerImplementation = (await withdrawalQueueManagerFactory.deploy(
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await withdrawalQueueManagerImplementation.waitForDeployment();
  const inheritanceManagerImplementation = (await inheritanceManagerFactory.deploy(
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await inheritanceManagerImplementation.waitForDeployment();
  const adminManagerImplementation = (await adminManagerFactory.deploy(
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await adminManagerImplementation.waitForDeployment();

  currentStep = 'deploy-hub';
  const hub = (await hubFactory.deploy(
    await token.getAddress(),
    '0x0000000000000000000000000000000000000000',
    await dao.getAddress(),
    await vaultDeployer.getAddress(),
    await intentValidator.getAddress(),
    await paymentQueueManagerImplementation.getAddress(),
    await withdrawalQueueManagerImplementation.getAddress(),
    await inheritanceManagerImplementation.getAddress(),
    await adminManagerImplementation.getAddress()
  )) as any;
  await hub.waitForDeployment();

  currentStep = 'bind-vault-deployer';
  await (await vaultDeployer.bindVaultHub(await hub.getAddress())).wait();

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
  const vaultHubAddress = await vaultA.hub();
  if (vaultHubAddress !== (await hub.getAddress())) {
    throw new Error(`Expected vault hub ${await hub.getAddress()}, got ${vaultHubAddress}`);
  }
  const activeWallet = await vaultA.activeWallet();
  if (activeWallet !== ownerAAddr) {
    throw new Error(`Expected active wallet ${ownerAAddr}, got ${activeWallet}`);
  }

  currentStep = 'mint-and-transfer';
  await (await token.connect(deployer).mint(vaultAAddr, parseUnits('50', 18))).wait();
  await (await vaultAAsOwner.setGuardian(await approver1.getAddress(), true)).wait();
  await (await vaultAAsOwner.setGuardian(await approver2.getAddress(), true)).wait();
  await (await vaultAAsOwner.setGuardianThreshold(2)).wait();
  await (await hub.connect(ownerA).completeGuardianSetup(vaultAAddr)).wait();
  const chainId = (await provider.getNetwork()).chainId;
  const nonce = await vaultA.nextNonce();
  const epoch = await vaultA.walletEpoch();
  const deadline = await chainDeadline(provider);
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

  currentStep = 'recovery-disabled-guards';
  // Stronger than the previous runtime "expect-revert" approach: assert the
  // selectors are absent from the compiled ABI entirely. After the v19.13
  // non-custody cleanup these functions were removed (not just stubbed to
  // revert), so this check guarantees no future regression silently re-adds
  // a freeze/recovery surface.
  const forbiddenSelectors = [
    'approveForceRecovery',
    'initiateForceRecovery',
    'finalizeForceRecovery',
    'requestDAORecovery',
    'finalizeDAORecovery',
    'cancelDAORecovery',
  ];
  for (const name of forbiddenSelectors) {
    const present = hubArtifact.abi.some(
      (entry: any) => entry?.type === 'function' && entry?.name === name
    );
    if (present) {
      throw new Error(
        `Non-custody violation: VaultHub ABI exposes ${name}. ` +
          'These selectors must remain absent — recovery is exclusively through ' +
          'VaultRecoveryClaim (guardian flow). See PRODUCTION_SET.md and ' +
          'AUDIT_CLOSURE_REPORT.md.'
      );
    }
  }

  console.log('VaultHub CardBound integration verification passed');
}

main().catch((error) => {
  console.error(error);
  console.error(`Verifier failed at step: ${currentStep}`);
  process.exit(1);
});
