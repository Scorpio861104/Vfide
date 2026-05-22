/* eslint-disable @typescript-eslint/no-require-imports */
// CJS contract-size utility script. Uses require() intentionally because the
// solc API expects to be invoked under CommonJS, and this script is invoked
// directly by node, never bundled.
const solcLib = require('solc');
const solc = solcLib.setupMethods(require('/tmp/soljson-0.8.30.js'));
const fs = require('fs');
const path = require('path');

console.log('solc version:', solc.version());

function findImports(p) {
  let resolved;
  if (p.startsWith('./') || p.startsWith('../')) {
    resolved = p;
  } else {
    const tries = [
      path.join('contracts', p),
      path.join('node_modules', p),
      p
    ];
    for (const t of tries) {
      if (fs.existsSync(t)) { resolved = t; break; }
    }
  }
  if (!resolved || !fs.existsSync(resolved)) {
    return { error: 'File not found: ' + p };
  }
  return { contents: fs.readFileSync(resolved, 'utf8') };
}

// Per-file settings mirroring hardhat.config.* exactly so check_size predictions match
// the deployed bytecode. Defaults to runs:0 (no strip) when not specified.
const PER_FILE_SETTINGS = {
  'contracts/VFIDEToken.sol':                     { runs: 0,  strip: true  },
  'contracts/future/SeerAutonomous.sol':          { runs: 1,  strip: false },
  'contracts/EcosystemVault.sol':                 { runs: 0,  strip: true  },
  'contracts/MerchantPortal.sol':                 { runs: 0,  strip: true  },
  'contracts/VaultHub.sol':                       { runs: 0,  strip: true  },
  'contracts/vault/CardBoundVault.sol':           { runs: 0,  strip: true  },
  'contracts/vault/CardBoundVaultDeployer.sol':   { runs: 0,  strip: true  },
};

const targets = [
  'contracts/VFIDEToken.sol',
  'contracts/future/SeerAutonomous.sol',
  'contracts/EcosystemVault.sol',
  'contracts/MerchantPortal.sol',
  'contracts/vault/CardBoundVault.sol',
  'contracts/vault/CardBoundVaultDeployer.sol',
  'contracts/VaultHub.sol',
  'contracts/Seer.sol',
  'contracts/StablecoinRegistry.sol',
  'contracts/MerchantRegistry.sol',
  'contracts/DAO.sol',
  'contracts/TrustGateway.sol',
  'contracts/GuardianRegistry.sol',
  'contracts/GuardianLock.sol',
  'contracts/PanicGuard.sol',
  'contracts/EmergencyBreaker.sol',
  'contracts/OwnerControlPanel.sol',
];

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log(file, 'MISSING');
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  const cfg = PER_FILE_SETTINGS[file] || { runs: 0, strip: false };
  const settings = {
    viaIR: true,
    optimizer: { enabled: true, runs: cfg.runs },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } },
    metadata: { bytecodeHash: 'none' },
  };
  if (cfg.strip) settings.debug = { revertStrings: 'strip' };
  const input = {
    language: 'Solidity',
    sources: { [file]: { content } },
    settings,
  };
  try {
    const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    if (out.errors) {
      const errs = out.errors.filter(e => e.severity === 'error');
      if (errs.length) {
        console.log(file, '== ERRORS:');
        errs.slice(0, 3).forEach(e => console.log('  -', e.formattedMessage?.slice(0, 200)));
        continue;
      }
    }
    if (out.contracts && out.contracts[file]) {
      const names = Object.keys(out.contracts[file]);
      for (const n of names) {
        const bc = out.contracts[file][n].evm?.deployedBytecode?.object;
        if (bc) {
          const len = bc.length / 2;
          const over = len - 24576;
          const tag = `runs=${cfg.runs}${cfg.strip ? ' strip' : ''}`;
          console.log(`${file}:${n}  ${len} bytes  ${over > 0 ? '(+' + over + ' OVER!)' : '(' + over + ' under)'}  [${tag}]`);
        }
      }
    }
  } catch (e) {
    console.log(file, 'COMPILE ERROR:', e.message);
  }
}
