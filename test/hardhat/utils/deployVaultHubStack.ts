export async function deployVaultHubStack(
  ethers: any,
  vfideToken: string,
  ledger: string,
  dao: string
): Promise<any> {
  const InitCodeChunk0 = await ethers.getContractFactory('CardBoundVaultInitCodeChunk0');
  const initCodeChunk0 = await InitCodeChunk0.deploy();
  await initCodeChunk0.waitForDeployment();

  const InitCodeChunk1 = await ethers.getContractFactory('CardBoundVaultInitCodeChunk1');
  const initCodeChunk1 = await InitCodeChunk1.deploy();
  await initCodeChunk1.waitForDeployment();

  const InitCodeChunk2 = await ethers.getContractFactory('CardBoundVaultInitCodeChunk2');
  const initCodeChunk2 = await InitCodeChunk2.deploy();
  await initCodeChunk2.waitForDeployment();

  const InitCodeChunk3 = await ethers.getContractFactory('CardBoundVaultInitCodeChunk3');
  const initCodeChunk3 = await InitCodeChunk3.deploy();
  await initCodeChunk3.waitForDeployment();

  const InitCodeStore = await ethers.getContractFactory('CardBoundVaultInitCodeStore');
  const initCodeStore = await InitCodeStore.deploy(
    await initCodeChunk0.getAddress(),
    await initCodeChunk1.getAddress(),
    await initCodeChunk2.getAddress(),
    await initCodeChunk3.getAddress()
  );
  await initCodeStore.waitForDeployment();

  const VaultDeployer = await ethers.getContractFactory('CardBoundVaultDeployer');
  const vaultDeployer = await VaultDeployer.deploy(await initCodeStore.getAddress());
  await vaultDeployer.waitForDeployment();

  const IntentValidator = await ethers.getContractFactory('CardBoundVaultIntentValidator');
  const intentValidator = await IntentValidator.deploy();
  await intentValidator.waitForDeployment();

  const PaymentQueueManager = await ethers.getContractFactory('CardBoundVaultPaymentQueueManager');
  const paymentQueueManagerImplementation = await PaymentQueueManager.deploy(ethers.ZeroAddress, 0);
  await paymentQueueManagerImplementation.waitForDeployment();

  const WithdrawalQueueManager = await ethers.getContractFactory(
    'CardBoundVaultWithdrawalQueueManager'
  );
  const withdrawalQueueManagerImplementation = await WithdrawalQueueManager.deploy(
    ethers.ZeroAddress
  );
  await withdrawalQueueManagerImplementation.waitForDeployment();

  const InheritanceManager = await ethers.getContractFactory('CardBoundVaultInheritanceManager');
  const inheritanceManagerImplementation = await InheritanceManager.deploy(ethers.ZeroAddress);
  await inheritanceManagerImplementation.waitForDeployment();

  const AdminManager = await ethers.getContractFactory('CardBoundVaultAdminManager');
  const adminManagerImplementation = await AdminManager.deploy(ethers.ZeroAddress);
  await adminManagerImplementation.waitForDeployment();

  const VaultHub = await ethers.getContractFactory('VaultHub');
  const vaultHub = await VaultHub.deploy(
    vfideToken,
    ledger,
    dao,
    await vaultDeployer.getAddress(),
    await intentValidator.getAddress(),
    await paymentQueueManagerImplementation.getAddress(),
    await withdrawalQueueManagerImplementation.getAddress(),
    await inheritanceManagerImplementation.getAddress(),
    await adminManagerImplementation.getAddress()
  );
  await vaultHub.waitForDeployment();

  await (await vaultDeployer.bindVaultHub(await vaultHub.getAddress())).wait();

  return {
    vaultHub,
    vaultDeployer,
    initCodeStore,
    initCodeChunk0,
    initCodeChunk1,
    initCodeChunk2,
    initCodeChunk3,
    intentValidator,
    paymentQueueManagerImplementation,
    withdrawalQueueManagerImplementation,
    inheritanceManagerImplementation,
    adminManagerImplementation,
  };
}
