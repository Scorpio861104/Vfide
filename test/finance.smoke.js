const { expect } = require('chai');

// Deploy StablecoinRegistry (from VFIDEFinance subset) and exercise minimal paths.
describe('Finance Smoke: StablecoinRegistry', function () {
  it('deploys and sets DAO', async function () {
    const [dao, other] = await ethers.getSigners();
    const Ledger = await ethers.getContractFactory('ProofLedger'); // from VFIDETrust subset
    const ledger = await Ledger.deploy(dao.address);
    await ledger.waitForDeployment();

    const RegistryFactory = await ethers.getContractFactory('StablecoinRegistry');
    const registry = await RegistryFactory.deploy(dao.address, await ledger.getAddress());
    await registry.waitForDeployment();

    expect(await registry.dao()).to.equal(dao.address);
    // toggle TEST_onlyDAO_off then perform addAsset from non-DAO
    await registry.connect(dao).TEST_setOnlyDAOOff(true);
    const tokenMock = await ethers.getContractFactory('ERC20Mock');
    const mock = await tokenMock.deploy('Mock', 'MCK', dao.address, 1000n);
    await mock.waitForDeployment();
    await registry.connect(other).addAsset(await mock.getAddress(), 'MCK');
    const isWL = await registry.isWhitelisted(await mock.getAddress());
    expect(isWL).to.equal(true);
  });
});
