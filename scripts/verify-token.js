// Verify VFIDEToken on zkSync explorer via hardhat task
// Requires: ZKSYNC_VERIFY=1, TOKEN_ADDRESS, DEV_VESTING_VAULT, VAULT_HUB, LEDGER, TREASURY_SINK

async function main() {
  const hre = require('hardhat');
  const addr = process.env.TOKEN_ADDRESS;
  const devVault = process.env.DEV_VESTING_VAULT;
  const vaultHub = process.env.VAULT_HUB || hre.ethers.ZeroAddress;
  const ledger = process.env.LEDGER || hre.ethers.ZeroAddress;
  const treasury = process.env.TREASURY_SINK || hre.ethers.ZeroAddress;

  if (!addr) throw new Error('TOKEN_ADDRESS env not set');
  if (!devVault) throw new Error('DEV_VESTING_VAULT env not set');

  const args = [devVault, vaultHub, ledger, treasury];
  console.log('Verifying VFIDEToken', addr, 'with args', args);
  await hre.run('verify:verify', {
    address: addr,
    constructorArguments: args,
  });
  console.log('Verification submitted.');
}

main().catch((e) => { console.error(e); process.exit(1); });
