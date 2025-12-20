// Verify ProofLedger on zkSync explorer via hardhat task
// Requires: ZKSYNC_VERIFY=1 (to load plugin), LEDGER_ADDRESS, DAO_ADDRESS (constructor)

async function main() {
  const hre = require('hardhat');
  const addr = process.env.LEDGER_ADDRESS;
  const dao = process.env.DAO_ADDRESS;
  if (!addr) throw new Error('LEDGER_ADDRESS env not set');
  if (!dao) throw new Error('DAO_ADDRESS env not set');

  console.log('Verifying ProofLedger', addr, 'with DAO', dao);
  await hre.run('verify:verify', {
    address: addr,
    constructorArguments: [dao],
  });
  console.log('Verification submitted.');
}

main().catch((e) => { console.error(e); process.exit(1); });
