const { expect } = require('chai');

// Differential test skeleton: compares basic behavior on EVM vs zkSync.
// This is a placeholder and skips by default. Enable with DIFF_ENABLE=1 and
// provide a funded PRIVATE_KEY and access to a zkSync endpoint.
// Suggested approach (manual for now):
// 1) Deploy on EVM (hardhat) and record outputs
// 2) Deploy on zkSync (zkSyncSepoliaTestnet) and record outputs
// 3) Compare invariants (names, symbols, totalSupply after same sequence, etc.)
//
// Running idea (manual):
//   npx hardhat test --network hardhat test/diff/evm-vs-zk.diff.test.js
//   DIFF_ENABLE=1 PRIVATE_KEY=0x... npx hardhat test --network zkSyncSepoliaTestnet test/diff/evm-vs-zk.diff.test.js
// Then compare logs.

const DIFF_ENABLED = process.env.DIFF_ENABLE === '1';

describe('Differential: EVM vs zkSync (skeleton)', function () {
  before(function () {
    if (!DIFF_ENABLED) {
      this.skip();
    }
  });

  it('VFIDEToken basic attributes are consistent', async function () {
    // NOTE: In a full implementation, deploy VFIDEToken and compare name/symbol/decimals
    // here. For now, this logs network info to help validate the setup.
    const hre = require('hardhat');
    const net = hre.network.name;
    console.log('[diff] Running on network =', net);
    expect(['hardhat', 'zkLocal', 'zkSyncSepoliaTestnet', 'zkSyncMainnet']).to.include(net);
  });
});
