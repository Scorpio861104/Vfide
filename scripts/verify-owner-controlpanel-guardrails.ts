import { AbiCoder, ContractFactory, JsonRpcProvider, keccak256 } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function expectRevert(action: () => Promise<unknown>) {
  try {
    const result = await action();
    if (typeof result === 'object' && result !== null && 'wait' in result) {
      await (result as { wait: () => Promise<unknown> }).wait();
    }
    throw new Error('Expected transaction to revert but it succeeded');
  } catch (error) {
    const text = String(error);
    if (text.includes('Expected transaction to revert but it succeeded')) {
      throw error;
    }
  }
}

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

async function main() {
  const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpcUrl);
  const owner = await provider.getSigner(0);
  const other = await provider.getSigner(1);

  const ocpArtifact = loadArtifact(
    'artifacts/contracts/OwnerControlPanel.sol/OwnerControlPanel.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/OwnerControlPanelGuardrailMocks.sol/MockVFIDETokenForOwnerControlPanel.json'
  );
  const ecosystemArtifact = loadArtifact(
    'artifacts/contracts/mocks/OwnerControlPanelGuardrailMocks.sol/MockEcosystemVaultAdminForOwnerControlPanel.json'
  );

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, owner);
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  const ecoFactory = new ContractFactory(
    ecosystemArtifact.abi as any,
    ecosystemArtifact.bytecode,
    owner
  );
  const eco = (await ecoFactory.deploy()) as any;
  await eco.waitForDeployment();

  const ocpFactory = new ContractFactory(ocpArtifact.abi as any, ocpArtifact.bytecode, owner);
  const ocp = (await ocpFactory.deploy(
    await owner.getAddress(),
    await token.getAddress(),
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await ocp.waitForDeployment();

  const ecosystemAddress = await eco.getAddress();
  const setEcosystemActionId = keccak256(
    AbiCoder.defaultAbiCoder().encode(['string', 'address'], ['setEcosystemContracts', ecosystemAddress])
  );
  await (await ocp.governance_queueAction(setEcosystemActionId)).wait();
  const initialDelay = await ocp.governanceDelay();
  await increaseTime(provider, Number(initialDelay) + 1);
  await (await ocp.setEcosystemContracts(ecosystemAddress)).wait();

  const actionId = (label: string, types: string[] = [], values: unknown[] = []): string =>
    keccak256(
      AbiCoder.defaultAbiCoder().encode(['string', ...types], [label, ...values])
    );

  await expectRevert(() => ocp.token_lockPolicy({ gasLimit: 5_000_000 }));

  const lockActionId = actionId('token_lockPolicy');
  await (await ocp.governance_queueAction(lockActionId)).wait();

  await expectRevert(() => ocp.token_lockPolicy({ gasLimit: 5_000_000 }));

  const lockDelay = await ocp.governanceDelay();
  await increaseTime(provider, Number(lockDelay) + 1);
  await (await ocp.token_lockPolicy()).wait();

  const isLocked = await token.policyLocked();
  if (!isLocked) {
    throw new Error('Expected token policy to be locked after queued execution');
  }

  const currentDelay = await ocp.governanceDelay();
  const updatedDelay = 2n * 24n * 60n * 60n;
  const setDelayActionId = actionId('governance_setDelay', ['uint256'], [updatedDelay]);
  await (await ocp.governance_queueAction(setDelayActionId)).wait();
  await increaseTime(provider, Number(currentDelay) + 1);
  await (await ocp.governance_setDelay(updatedDelay)).wait();
  const delay = await ocp.governanceDelay();
  if (delay !== updatedDelay) {
    throw new Error(`Unexpected governance delay: ${delay}`);
  }

  await expectRevert(() => ocp.governance_setDelay(30, { gasLimit: 5_000_000 }));

  const setSlippageActionId = actionId('governance_setMaxAutoSwapSlippageBps', ['uint16'], [300]);
  await (await ocp.governance_queueAction(setSlippageActionId)).wait();
  await increaseTime(provider, Number(await ocp.governanceDelay()) + 1);
  await (await ocp.governance_setMaxAutoSwapSlippageBps(300)).wait();
  await expectRevert(async () =>
    ocp.autoSwap_configure(await other.getAddress(), await owner.getAddress(), true, 400, {
      gasLimit: 5_000_000,
    })
  );

  const oneEth = 1_000_000_000_000_000_000n;
  const halfEth = 500_000_000_000_000_000n;
  const quarterEth = 250_000_000_000_000_000n;

  const setPayoutBoundsActionId = actionId(
    'governance_setAutoWorkPayoutBounds',
    ['uint256', 'uint256'],
    [2n, 10n * oneEth]
  );
  await (await ocp.governance_queueAction(setPayoutBoundsActionId)).wait();
  await increaseTime(provider, Number(await ocp.governanceDelay()) + 1);
  await (await ocp.governance_setAutoWorkPayoutBounds(2, 10n * oneEth)).wait();
  await expectRevert(() =>
    ocp.ecosystem_configureAutoWorkPayout(true, 1, 1, 1, { gasLimit: 5_000_000 })
  );

  const workActionId = actionId(
    'ecosystem_configureAutoWorkPayout',
    ['bool', 'uint256', 'uint256', 'uint256'],
    [true, oneEth, halfEth, quarterEth]
  );
  await (await ocp.governance_queueAction(workActionId)).wait();

  await increaseTime(provider, Number(await ocp.governanceDelay()) + 1);
  await (await ocp.ecosystem_configureAutoWorkPayout(true, oneEth, halfEth, quarterEth)).wait();

  const config = await ocp.ecosystem_getAutoWorkPayoutConfig();
  if (!config[0]) {
    throw new Error('Expected auto work payout to be enabled');
  }

  const cancelActionId = actionId(
    'autoSwap_quickSetupUSDC',
    ['address', 'address'],
    [await owner.getAddress(), await other.getAddress()]
  );
  await (await ocp.governance_queueAction(cancelActionId)).wait();
  await (await ocp.governance_cancelAction(cancelActionId)).wait();
  await expectRevert(async () =>
    ocp.autoSwap_quickSetupUSDC(await owner.getAddress(), await other.getAddress(), {
      gasLimit: 5_000_000,
    })
  );

  console.log('OwnerControlPanel guardrail integration checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
