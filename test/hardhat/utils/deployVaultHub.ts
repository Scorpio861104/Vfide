/**
 * deployVaultHub — shared test helper
 *
 * Deploy order:
 *   1. CardBoundVaultBytecodeProvider   (holds CBV initcode — no hub dependency)
 *   2. CardBoundVaultSubManagerDeployer (deploys the 4 sub-managers — no hub dependency)
 *   3. CardBoundVaultDeployer           (2 args: subMgr + bytecodeProvider)
 *   4. VaultHub                         (4 args: token, ledger, dao, cbvDeployer)
 *   5. cbvd.initHub(hubAddr)            (one-time wiring — only original deployer can call)
 *
 * Accepts a scoped `ethers` instance (from network.connect()) to avoid ESM
 * import issues with the mocha runner on Node 22.
 */
export async function deployVaultHub(
  ethers: any,
  tokenAddr: string,
  ledgerAddr: string,
  daoAddr: string,
) {
  const BPFact = await ethers.getContractFactory('CardBoundVaultBytecodeProvider');
  const bp = await BPFact.deploy();
  await bp.waitForDeployment();

  const SubMgrFact = await ethers.getContractFactory('CardBoundVaultSubManagerDeployer');
  const subMgr = await SubMgrFact.deploy();
  await subMgr.waitForDeployment();

  const CBVDFact = await ethers.getContractFactory('CardBoundVaultDeployer');
  const cbvd = await CBVDFact.deploy(await subMgr.getAddress(), await bp.getAddress());
  await cbvd.waitForDeployment();

  const HubFact = await ethers.getContractFactory('VaultHub');
  const hub = await HubFact.deploy(tokenAddr, ledgerAddr, daoAddr, await cbvd.getAddress());
  await hub.waitForDeployment();

  // Wire the deployer back to the hub (one-time initHub call)
  await (await cbvd.initHub(await hub.getAddress())).wait();

  return { hub, cbvd, subMgr, bp };
}
