import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;
async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

/**
 * RevenueSplitter test suite.
 *
 * RevenueSplitter routes incoming token revenue to configured payees by
 * basis-point share. The last payee gets the remainder (so the math always
 * sums exactly to the held balance, regardless of rounding).
 *
 * Updates to the payee configuration are gated by a 48-hour timelock,
 * giving stakeholders time to react if the owner attempts a malicious
 * reallocation.
 *
 * This contract had zero test coverage before this suite.
 */
describe('RevenueSplitter', () => {
  async function basicSetup() {
    const { ethers } = (await getConnection()) as any;
    const [owner, alice, bob, charlie, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('TestMintableToken');
    const token = await Token.deploy();
    await token.waitForDeployment();

    return { ethers, owner, alice, bob, charlie, other, token };
  }

  async function deployWithThreePayees() {
    const { ethers, owner, alice, bob, charlie, other, token } = await basicSetup();

    // 40 / 30 / 30 split
    const RS = await ethers.getContractFactory('RevenueSplitter');
    const rs = await RS.connect(owner).deploy(
      [alice.address, bob.address, charlie.address],
      [4000, 3000, 3000]
    );
    await rs.waitForDeployment();

    return { ethers, owner, alice, bob, charlie, other, token, rs };
  }

  describe('constructor', () => {
    it('rejects length mismatch between accounts and shares', async () => {
      const { ethers, alice, bob } = await basicSetup();
      const RS = await ethers.getContractFactory('RevenueSplitter');
      await assert.rejects(RS.deploy([alice.address, bob.address], [10000]), /length mismatch/);
    });

    it('rejects empty payee list', async () => {
      const { ethers } = await basicSetup();
      const RS = await ethers.getContractFactory('RevenueSplitter');
      await assert.rejects(RS.deploy([], []), /no payees/);
    });

    it('rejects zero address payee', async () => {
      const { ethers, alice } = await basicSetup();
      const RS = await ethers.getContractFactory('RevenueSplitter');
      await assert.rejects(
        RS.deploy([alice.address, ethers.ZeroAddress], [5000, 5000]),
        /zero address/
      );
    });

    it('rejects zero-share payee', async () => {
      const { ethers, alice, bob } = await basicSetup();
      const RS = await ethers.getContractFactory('RevenueSplitter');
      await assert.rejects(RS.deploy([alice.address, bob.address], [10000, 0]), /zero share/);
    });

    it('rejects total != 100% (10000 bps)', async () => {
      const { ethers, alice, bob } = await basicSetup();
      const RS = await ethers.getContractFactory('RevenueSplitter');
      await assert.rejects(
        RS.deploy([alice.address, bob.address], [4000, 4000]),
        /must equal 100%/
      );
      await assert.rejects(
        RS.deploy([alice.address, bob.address], [6000, 5000]),
        /must equal 100%/
      );
    });

    it('accepts a valid configuration and stores owner', async () => {
      const { rs, owner } = await deployWithThreePayees();
      assert.equal(await rs.owner(), owner.address);
      assert.equal(await rs.totalShares(), 10000n);
    });
  });

  describe('distribute', () => {
    it('rejects zero-token address', async () => {
      const { ethers, rs } = await deployWithThreePayees();
      await assert.rejects(rs.distribute(ethers.ZeroAddress), /zero token/);
    });

    it('rejects when balance is zero', async () => {
      const { rs, token } = await deployWithThreePayees();
      await assert.rejects(rs.distribute(await token.getAddress()), /no funds/);
    });

    it('splits proportionally across payees', async () => {
      const { ethers, rs, token, alice, bob, charlie } = await deployWithThreePayees();
      // Mint 1000 tokens to the splitter
      const amount = ethers.parseEther('1000');
      await token.mint(await rs.getAddress(), amount);
      await rs.distribute(await token.getAddress());

      // 40 / 30 / 30 → 400, 300, 300
      assert.equal(await token.balanceOf(alice.address), ethers.parseEther('400'));
      assert.equal(await token.balanceOf(bob.address), ethers.parseEther('300'));
      assert.equal(await token.balanceOf(charlie.address), ethers.parseEther('300'));
      assert.equal(await token.balanceOf(await rs.getAddress()), 0n);
    });

    it('gives the remainder to the last payee (no dust loss)', async () => {
      const { ethers, owner, token, alice, bob, charlie } = await basicSetup();
      // Use 33/33/34 — divides unevenly into 1000
      const RS = await ethers.getContractFactory('RevenueSplitter');
      const rs = await RS.connect(owner).deploy(
        [alice.address, bob.address, charlie.address],
        [3333, 3333, 3334]
      );

      // Mint a small amount that doesn't divide evenly
      // balance * 3333 / 10000 truncates; remainder lands on last
      const amount = 1001n; // 1001 wei. 1001 * 3333 / 10000 = 333; remainder 1001 - 333 - 333 = 335
      await token.mint(await rs.getAddress(), amount);
      await rs.distribute(await token.getAddress());

      const ab = await token.balanceOf(alice.address);
      const bb = await token.balanceOf(bob.address);
      const cb = await token.balanceOf(charlie.address);
      // Sum equals total
      assert.equal(ab + bb + cb, amount);
      // First two get the truncated amount, last gets remainder
      assert.equal(ab, 333n);
      assert.equal(bb, 333n);
      assert.equal(cb, 335n);
      // Splitter is fully drained
      assert.equal(await token.balanceOf(await rs.getAddress()), 0n);
    });
  });

  describe('updatePayees + applyPayeesUpdate (48h timelock)', () => {
    it('rejects non-owner caller', async () => {
      const { rs, other, alice } = await deployWithThreePayees();
      await assert.rejects(rs.connect(other).updatePayees([alice.address], [10000]), /not owner/);
    });

    it("rejects new config that doesn't sum to 100%", async () => {
      const { rs, owner, alice, bob } = await deployWithThreePayees();
      await assert.rejects(
        rs.connect(owner).updatePayees([alice.address, bob.address], [5000, 4000]),
        /must equal 100%/
      );
    });

    it('rejects apply before 48h timelock elapses', async () => {
      const { rs, owner, alice } = await deployWithThreePayees();
      await rs.connect(owner).updatePayees([alice.address], [10000]);
      await assert.rejects(rs.connect(owner).applyPayeesUpdate(), /timelock pending/);
    });

    it('applies new config after 48h', async () => {
      const { ethers, rs, owner, alice, token } = await deployWithThreePayees();
      await rs.connect(owner).updatePayees([alice.address], [10000]);

      await ethers.provider.send('evm_increaseTime', [48 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine', []);

      await rs.connect(owner).applyPayeesUpdate();

      // Sanity check via distribute: alice gets 100%
      const amount = ethers.parseEther('500');
      await token.mint(await rs.getAddress(), amount);
      await rs.distribute(await token.getAddress());
      assert.equal(await token.balanceOf(alice.address), amount);
    });

    it('rejects applyPayeesUpdate when nothing pending', async () => {
      const { rs, owner } = await deployWithThreePayees();
      await assert.rejects(rs.connect(owner).applyPayeesUpdate(), /nothing pending/);
    });

    it('only owner can apply', async () => {
      const { ethers, rs, owner, other, alice } = await deployWithThreePayees();
      await rs.connect(owner).updatePayees([alice.address], [10000]);
      await ethers.provider.send('evm_increaseTime', [48 * 60 * 60 + 1]);
      await ethers.provider.send('evm_mine', []);
      await assert.rejects(rs.connect(other).applyPayeesUpdate(), /not owner/);
    });
  });

  describe('cancelPayeesUpdate', () => {
    it('cancels a pending update so applyPayeesUpdate then reverts', async () => {
      const { rs, owner, alice } = await deployWithThreePayees();
      await rs.connect(owner).updatePayees([alice.address], [10000]);
      await rs.connect(owner).cancelPayeesUpdate();
      await assert.rejects(rs.connect(owner).applyPayeesUpdate(), /nothing pending/);
    });

    it('only owner can cancel', async () => {
      const { rs, owner, other, alice } = await deployWithThreePayees();
      await rs.connect(owner).updatePayees([alice.address], [10000]);
      await assert.rejects(rs.connect(other).cancelPayeesUpdate(), /not owner/);
    });
  });

  describe('constants', () => {
    it('PAYEES_UPDATE_DELAY is 48 hours', async () => {
      const { rs } = await deployWithThreePayees();
      assert.equal(await rs.PAYEES_UPDATE_DELAY(), 48n * 60n * 60n);
    });
  });
});
