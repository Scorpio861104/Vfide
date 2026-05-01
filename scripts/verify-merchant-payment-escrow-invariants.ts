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

  const dao = await provider.getSigner(0);
  const buyer = await provider.getSigner(1);
  const merchant = await provider.getSigner(2);
  const daoAddress = await dao.getAddress();
  const merchantAddress = await merchant.getAddress();

  const seerArtifact = loadArtifact(
    'artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockSeerForEscrow.json'
  );
  const tokenArtifact = loadArtifact(
    'artifacts/contracts/mocks/EscrowManagerVerifierMocks.sol/MockTokenForEscrow.json'
  );
  const escrowArtifact = loadArtifact('artifacts/contracts/EscrowManager.sol/EscrowManager.json');

  const seerFactory = new ContractFactory(seerArtifact.abi as any, seerArtifact.bytecode, dao);
  const seer = (await seerFactory.deploy()) as any;
  await seer.waitForDeployment();
  await (await seer.setScore(merchantAddress, 6500)).wait();

  const tokenFactory = new ContractFactory(tokenArtifact.abi as any, tokenArtifact.bytecode, dao);
  const token = (await tokenFactory.deploy()) as any;
  await token.waitForDeployment();

  const escrowFactory = new ContractFactory(
    escrowArtifact.abi as any,
    escrowArtifact.bytecode,
    dao
  );
  const escrow = (await escrowFactory.deploy(daoAddress, await seer.getAddress())) as any;
  await escrow.waitForDeployment();
  const tokenAddress = await token.getAddress();

  await expectRevert(() =>
    escrow
      .connect(buyer)
      .createEscrow(merchantAddress, tokenAddress, 1_000n, 'ord-1')
  );

  console.log('EscrowManager invariant checks passed (createEscrow is deprecated)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
