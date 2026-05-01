import fs from 'node:fs';
import path from 'node:path';
import hre from 'hardhat';

const ethers = (hre as any).ethers;

type DeploymentBook = Record<string, string>;

function readDeploymentBook(networkName: string): DeploymentBook {
  const filePath = path.join(process.cwd(), '.deployments', `${networkName}.json`);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as DeploymentBook;
}

function writeDeploymentBook(networkName: string, deployed: DeploymentBook): void {
  const dirPath = path.join(process.cwd(), '.deployments');
  fs.mkdirSync(dirPath, { recursive: true });
  const filePath = path.join(dirPath, `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deployed, null, 2));
}

function parseContractArgs(contractName: string): unknown[] {
  const key = `ARGS_${contractName.toUpperCase()}`;
  const raw = process.env[key];
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown[];
  if (!Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON array`);
  }
  return parsed;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = process.env.HARDHAT_NETWORK ?? 'hardhat';
  const deployed = readDeploymentBook(networkName);

  console.log('Phase 3 deploy network:', networkName);
  console.log('Deployer:', deployer.address);

  const phase3Contracts = [
    'SanctumVault',
    'EcosystemVault',
    'EcosystemVaultView',
    'CouncilElection',
    'CouncilManager',
    'CouncilSalary',
    'BadgeManager',
    'VFIDEBadgeNFT',
    'VaultRegistry',
    'PayrollManager',
    'LiquidityIncentives',
  ] as const;

  for (const contractName of phase3Contracts) {
    const args = parseContractArgs(contractName);
    console.log(`\nDeploying ${contractName} with ${args.length} args`);
    const factory = await ethers.getContractFactory(contractName);
    const instance = await factory.deploy(...args);
    await instance.waitForDeployment();
    const address = await instance.getAddress();
    deployed[contractName] = address;
    console.log(`  ${contractName}: ${address}`);
  }

  writeDeploymentBook(networkName, deployed);
  console.log(`\nPhase 3 deployment complete. Saved addresses to .deployments/${networkName}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
