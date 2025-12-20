// Verify all contracts from deployments registry for the current Hardhat network
// Requires: ZKSYNC_VERIFY=1

async function main() {
  const hre = require('hardhat');
  const { loadRegistry } = require('./registry');
  const net = hre.network.name;
  const reg = loadRegistry(net);
  if (!reg || Object.keys(reg).length === 0) {
    console.log(`No deployments found for ${net}`);
    return;
  }
  for (const [name, entry] of Object.entries(reg)) {
    if (!entry || !entry.address) continue;
    const args = Array.isArray(entry.args) ? entry.args : [];
    console.log(`[Verify] ${name} at ${entry.address} args=${JSON.stringify(args)}`);
    try {
      await hre.run('verify:verify', { address: entry.address, constructorArguments: args });
      console.log(`[Verify] Submitted ${name}`);
    } catch (e) {
      console.warn(`[Verify] ${name} failed:`, e.message);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
