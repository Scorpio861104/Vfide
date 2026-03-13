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
  const candidate1 = await provider.getSigner(1);
  const candidate2 = await provider.getSigner(2);

  const ownerAddress = await owner.getAddress();
  const candidate1Address = await candidate1.getAddress();
  const candidate2Address = await candidate2.getAddress();

  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockTokenForEscrow.json'
  );
  const endpointArtifact = loadArtifact(
    'artifacts/contracts/mocks/BridgeGovernanceVerifierMocks.sol/MockLzEndpointForBridge.json'
  );
  const bridgeArtifact = loadArtifact('artifacts/contracts/VFIDEBridge.sol/VFIDEBridge.json');

  const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, owner);
  const vfide = (await tokenFactory.deploy()) as any;
  await vfide.waitForDeployment();

  const rescueToken = (await tokenFactory.deploy()) as any;
  await rescueToken.waitForDeployment();

  const endpointFactory = new ContractFactory(
    endpointArtifact.abi,
    endpointArtifact.bytecode,
    owner
  );
  const endpoint = (await endpointFactory.deploy()) as any;
  await endpoint.waitForDeployment();

  const bridgeFactory = new ContractFactory(bridgeArtifact.abi, bridgeArtifact.bytecode, owner);
  const bridge = (await bridgeFactory.deploy(
    await vfide.getAddress(),
    await endpoint.getAddress(),
    ownerAddress
  )) as any;
  await bridge.waitForDeployment();

  const vfideAddress = await vfide.getAddress();
  const rescueTokenAddress = await rescueToken.getAddress();

  const timelockDelay = 48 * 60 * 60;

  // Security module: schedule only, apply after delay.
  await (await bridge.setSecurityModule(candidate1Address)).wait();
  if (
    (await bridge.securityModule()).toLowerCase() !== '0x0000000000000000000000000000000000000000'
  ) {
    throw new Error('Security module should not update immediately');
  }
  await expectRevert(() => bridge.applySecurityModule({ gasLimit: 5_000_000 }));
  await increaseTime(provider, timelockDelay + 1);
  await (await bridge.applySecurityModule()).wait();
  if ((await bridge.securityModule()).toLowerCase() !== candidate1Address.toLowerCase()) {
    throw new Error('Security module did not apply after timelock');
  }

  // Cancellation path.
  await (await bridge.setSecurityModule(candidate2Address)).wait();
  await (await bridge.cancelSecurityModule()).wait();
  await expectRevert(() => bridge.applySecurityModule({ gasLimit: 5_000_000 }));

  // Max bridge amount schedule/apply.
  const newMaxBridge = 250_000n * 10n ** 18n;
  await (await bridge.setMaxBridgeAmount(newMaxBridge)).wait();
  await expectRevert(() => bridge.applyMaxBridgeAmount({ gasLimit: 5_000_000 }));
  await increaseTime(provider, timelockDelay + 1);
  await (await bridge.applyMaxBridgeAmount()).wait();
  if ((await bridge.maxBridgeAmount()) !== newMaxBridge) {
    throw new Error('maxBridgeAmount did not apply after timelock');
  }

  // Bridge fee schedule/apply.
  await (await bridge.setBridgeFee(25)).wait();
  await expectRevert(() => bridge.applyBridgeFee({ gasLimit: 5_000_000 }));
  await increaseTime(provider, timelockDelay + 1);
  await (await bridge.applyBridgeFee()).wait();
  if ((await bridge.bridgeFee()) !== 25n) {
    throw new Error('bridgeFee did not apply after timelock');
  }

  // Fee collector schedule/apply.
  await (await bridge.setFeeCollector(candidate1Address)).wait();
  await expectRevert(() => bridge.applyFeeCollector({ gasLimit: 5_000_000 }));
  await increaseTime(provider, timelockDelay + 1);
  await (await bridge.applyFeeCollector()).wait();
  if ((await bridge.feeCollector()).toLowerCase() !== candidate1Address.toLowerCase()) {
    throw new Error('feeCollector did not apply after timelock');
  }

  // Emergency withdraw cannot target VFIDE liquidity.
  await expectRevert(() => bridge.emergencyWithdraw(vfideAddress, 1n, { gasLimit: 5_000_000 }));

  // Emergency withdraw for non-core token is timelocked and executable.
  const rescueAmount = 1000n * 10n ** 18n;
  await (await rescueToken.mint(await bridge.getAddress(), rescueAmount)).wait();
  await (await bridge.emergencyWithdraw(rescueTokenAddress, rescueAmount)).wait();
  await expectRevert(() => bridge.applyEmergencyWithdraw({ gasLimit: 5_000_000 }));
  await increaseTime(provider, timelockDelay + 1);
  await (await bridge.applyEmergencyWithdraw()).wait();

  const ownerRescueBalance = await rescueToken.balanceOf(ownerAddress);
  if (ownerRescueBalance !== rescueAmount) {
    throw new Error(`Unexpected rescue token balance after withdrawal: ${ownerRescueBalance}`);
  }

  console.log('Bridge governance timelock checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
