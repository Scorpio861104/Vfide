import { ContractFactory, JsonRpcProvider } from 'ethers';
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
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000'
  )) as any;
  await ocp.waitForDeployment();

  await (await ocp.setEcosystemContracts(await eco.getAddress())).wait();

  await expectRevert(() => ocp.token_lockPolicy({ gasLimit: 5_000_000 }));

  const lockActionId = await ocp.actionId_token_lockPolicy();
  await (await ocp.governance_queueAction(lockActionId)).wait();

  await expectRevert(() => ocp.token_lockPolicy({ gasLimit: 5_000_000 }));

  await increaseTime(provider, 24 * 60 * 60 + 1);
  await (await ocp.token_lockPolicy()).wait();

  const isLocked = await token.policyLocked();
  if (!isLocked) {
    throw new Error('Expected token policy to be locked after queued execution');
  }

  await (await ocp.governance_setDelay(2 * 60 * 60)).wait();
  const delay = await ocp.governanceDelay();
  if (delay !== 2n * 60n * 60n) {
    throw new Error(`Unexpected governance delay: ${delay}`);
  }

  await expectRevert(() => ocp.governance_setDelay(30, { gasLimit: 5_000_000 }));

  await (await ocp.governance_setMaxAutoSwapSlippageBps(300)).wait();
  await expectRevert(async () =>
    ocp.autoSwap_configure(await other.getAddress(), await owner.getAddress(), true, 400, {
      gasLimit: 5_000_000,
    })
  );

  const oneEth = 1_000_000_000_000_000_000n;
  const halfEth = 500_000_000_000_000_000n;
  const quarterEth = 250_000_000_000_000_000n;

  await (await ocp.governance_setAutoWorkPayoutBounds(2, 10n * oneEth)).wait();
  await expectRevert(() =>
    ocp.ecosystem_configureAutoWorkPayout(true, 1, 1, 1, { gasLimit: 5_000_000 })
  );

  const workActionId = await ocp.actionId_ecosystem_configureAutoWorkPayout(
    true,
    oneEth,
    halfEth,
    quarterEth
  );
  await (await ocp.governance_queueAction(workActionId)).wait();

  await increaseTime(provider, 2 * 60 * 60 + 1);
  await (await ocp.ecosystem_configureAutoWorkPayout(true, oneEth, halfEth, quarterEth)).wait();

  const config = await ocp.ecosystem_getAutoWorkPayoutConfig();
  if (!config[0]) {
    throw new Error('Expected auto work payout to be enabled');
  }

  const cancelActionId = await ocp.actionId_autoSwap_quickSetupUSDC(
    await owner.getAddress(),
    await other.getAddress()
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
