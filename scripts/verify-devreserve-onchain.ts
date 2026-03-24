import { ContractFactory, JsonRpcProvider, ZeroAddress } from 'ethers';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CLIFF = 60n * 24n * 60n * 60n;
const INTERVAL = CLIFF;
const UNLOCK = 2_777_777n * 10n ** 18n;
const ALLOCATION = 50_000_000n * 10n ** 18n;

function assertEq(actual: bigint, expected: bigint, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected.toString()}, got ${actual.toString()}`);
  }
}

async function setTime(ts: bigint) {
  await provider.send('evm_setNextBlockTimestamp', [Number(ts)]);
  await provider.send('evm_mine', []);
}

const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
const provider = new JsonRpcProvider(rpcUrl);

function loadArtifact(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8')) as {
    abi: any[];
    bytecode: string;
  };
}

async function deployFixture() {
  const deployer = await provider.getSigner(0);
  const beneficiary = await provider.getSigner(1);
  const vaultAddress = await deployer.getAddress();

  const now = BigInt((await provider.getBlock('latest'))!.timestamp);
  const startTs = now + 10n;

  const tokenArtifact = loadArtifact('artifacts/contracts/mocks/DevReserveVestingBehaviorMocks.sol/MockToken.json');
  const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, deployer);
  const token: any = await tokenFactory.deploy();
  await token.waitForDeployment();

  const vaultHubArtifact = loadArtifact('artifacts/contracts/mocks/DevReserveVestingBehaviorMocks.sol/MockVaultHub.json');
  const vaultHubFactory = new ContractFactory(vaultHubArtifact.abi, vaultHubArtifact.bytecode, deployer);
  const vaultHub: any = await vaultHubFactory.deploy(vaultAddress);
  await vaultHub.waitForDeployment();

  const securityHubArtifact = loadArtifact('artifacts/contracts/mocks/DevReserveVestingBehaviorMocks.sol/MockSecurityHub.json');
  const securityHubFactory = new ContractFactory(securityHubArtifact.abi, securityHubArtifact.bytecode, deployer);
  const securityHub: any = await securityHubFactory.deploy();
  await securityHub.waitForDeployment();

  const vestingArtifact = loadArtifact('artifacts/contracts/DevReserveVestingVault.sol/DevReserveVestingVault.json');
  const vestingFactory = new ContractFactory(vestingArtifact.abi, vestingArtifact.bytecode, deployer);
  const vestingVault: any = await vestingFactory.deploy(
    await token.getAddress(),
    await beneficiary.getAddress(),
    await vaultHub.getAddress(),
    await securityHub.getAddress(),
    ZeroAddress,
    ALLOCATION,
    ZeroAddress // DAO
  );
  await vestingVault.waitForDeployment();

  await token.mint(await vestingVault.getAddress(), ALLOCATION);

  // Set vesting start via explicit call (replaces presale-based start time)
  await setTime(startTs);
  await vestingVault.connect(beneficiary).setVestingStart(startTs);

  return { beneficiary, vaultAddress, startTs, token, vaultHub, securityHub, vestingVault };
}

async function verifyInvalidAllocationReverts(fx: any) {
  const deployer = await provider.getSigner(0);
  const vestingArtifact = loadArtifact('artifacts/contracts/DevReserveVestingVault.sol/DevReserveVestingVault.json');
  const vestingFactory = new ContractFactory(vestingArtifact.abi, vestingArtifact.bytecode, deployer);
  let reverted = false;

  try {
    await vestingFactory.deploy(
      await fx.token.getAddress(),
      await fx.beneficiary.getAddress(),
      await fx.vaultHub.getAddress(),
      await fx.securityHub.getAddress(),
      ZeroAddress,
      ALLOCATION - 1n,
      ZeroAddress
    );
  } catch {
    reverted = true;
  }

  if (!reverted) {
    throw new Error('invalid allocation did not revert');
  }
}

async function verifyCliffAndUnlockMath(fx: any) {
  await setTime(fx.startTs + CLIFF - 1n);
  assertEq(await fx.vestingVault.claimable(), 0n, 'claimable before cliff');

  await setTime(fx.startTs + CLIFF);
  assertEq(await fx.vestingVault.claimable(), UNLOCK, 'claimable at cliff');

  await setTime(fx.startTs + CLIFF + (2n * INTERVAL));
  assertEq(await fx.vestingVault.claimable(), UNLOCK * 3n, 'claimable after 2 intervals');
}

async function verifySecurityLockBlocksClaim(fx: any) {
  await setTime(fx.startTs + CLIFF);
  await fx.securityHub.setLocked(true);

  let reverted = false;
  try {
    await fx.vestingVault.connect(fx.beneficiary).claim();
  } catch {
    reverted = true;
  }
  if (!reverted) {
    throw new Error('claim did not revert while security lock was active');
  }
}

async function verifyUnauthorizedCannotClaim(fx: any) {
  const unauthorized = await provider.getSigner(2);
  await setTime(fx.startTs + CLIFF);

  let reverted = false;
  try {
    await fx.vestingVault.connect(unauthorized).claim();
  } catch {
    reverted = true;
  }
  if (!reverted) {
    throw new Error('unauthorized account was able to claim');
  }
}

async function verifyPauseBlocksClaim(fx: any) {
  await setTime(fx.startTs + CLIFF);
  await fx.vestingVault.connect(fx.beneficiary).pauseClaims(true);

  let reverted = false;
  try {
    await fx.vestingVault.connect(fx.beneficiary).claim();
  } catch {
    reverted = true;
  }
  if (!reverted) {
    throw new Error('claim succeeded while claims were paused');
  }
}

async function verifyClaimTransferAndAccounting(fx: any) {
  await fx.securityHub.setLocked(false);
  await setTime(fx.startTs + CLIFF + INTERVAL);

  const expected = UNLOCK * 2n;
  assertEq(await fx.token.balanceOf(fx.vaultAddress), 0n, 'vault balance before claim');

  await fx.vestingVault.connect(fx.beneficiary).claim();

  assertEq(await fx.token.balanceOf(fx.vaultAddress), expected, 'vault balance after claim');
  assertEq(await fx.vestingVault.totalClaimed(), expected, 'totalClaimed after claim');
  assertEq(await fx.vestingVault.claimable(), 0n, 'claimable after claim');
}

async function verifyFullVestingPayout(fx: any) {
  const VESTING = 36n * 30n * 24n * 60n * 60n;
  await fx.securityHub.setLocked(false);
  await setTime(fx.startTs + VESTING);

  await fx.vestingVault.connect(fx.beneficiary).claim();

  assertEq(await fx.token.balanceOf(fx.vaultAddress), ALLOCATION, 'vault balance after full vesting claim');
  assertEq(await fx.vestingVault.totalClaimed(), ALLOCATION, 'totalClaimed after full vesting claim');
  assertEq(await fx.vestingVault.claimable(), 0n, 'claimable after full vesting claim');
}

async function main() {
  console.log('Verifying DevReserve on-chain behavior...');
  await provider.getBlockNumber();

  await verifyInvalidAllocationReverts(await deployFixture());
  await verifyCliffAndUnlockMath(await deployFixture());
  await verifyUnauthorizedCannotClaim(await deployFixture());
  await verifyPauseBlocksClaim(await deployFixture());
  await verifySecurityLockBlocksClaim(await deployFixture());
  await verifyClaimTransferAndAccounting(await deployFixture());
  await verifyFullVestingPayout(await deployFixture());

  console.log('DevReserve on-chain verification passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
