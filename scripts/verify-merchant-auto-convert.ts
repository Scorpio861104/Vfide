import { network } from 'hardhat';

async function main() {
  const { ethers } = (await network.connect()) as any;
  const [dao, merchant] = await ethers.getSigners();

  const SeerStub = await ethers.getContractFactory('SeerScoreStub');
  const seer = await SeerStub.deploy();
  await seer.waitForDeployment();
  await seer.setScore(merchant.address, 7000);

  const Placeholder = await ethers.getContractFactory('Placeholder');
  const vaultHub = await Placeholder.deploy();
  const securityHub = await Placeholder.deploy();
  const ledger = await Placeholder.deploy();
  const feeSink = await Placeholder.deploy();
  const router = await Placeholder.deploy();
  const stablecoin = await Placeholder.deploy();

  await Promise.all([
    vaultHub.waitForDeployment(),
    securityHub.waitForDeployment(),
    ledger.waitForDeployment(),
    feeSink.waitForDeployment(),
    router.waitForDeployment(),
    stablecoin.waitForDeployment(),
  ]);

  const MerchantPortal = await ethers.getContractFactory('MerchantPortal');
  const portal = await MerchantPortal.deploy(
    dao.address,
    await vaultHub.getAddress(),
    await seer.getAddress(),
    await securityHub.getAddress(),
    await ledger.getAddress(),
    await feeSink.getAddress(),
  );
  await portal.waitForDeployment();

  await portal.connect(merchant).registerMerchant('Merchant', 'retail');

  let blocked = false;
  try {
    await portal.connect(merchant).setAutoConvert(true);
  } catch (error) {
    blocked = String(error).includes('swap not configured');
  }

  if (!blocked) {
    throw new Error('auto-convert was not blocked before swap config');
  }

  await portal.connect(dao).setAcceptedToken(await stablecoin.getAddress(), true);
  await portal.connect(dao).setSwapConfig(await router.getAddress(), await stablecoin.getAddress());
  await portal.connect(merchant).setAutoConvert(true);

  if (!(await portal.autoConvert(merchant.address))) {
    throw new Error('auto-convert did not enable after swap config');
  }

  await portal.connect(merchant).setAutoConvert(false);
  if (await portal.autoConvert(merchant.address)) {
    throw new Error('auto-convert did not disable cleanly');
  }

  console.log('AUTO_CONVERT_VERIFIED');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
