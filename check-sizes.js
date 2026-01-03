const fs = require('fs');
const path = require('path');

const artifactsDir = './artifacts/contracts';

function getContractSize(contractName) {
    const dirs = fs.readdirSync(artifactsDir);
    for (const dir of dirs) {
        const contractDir = path.join(artifactsDir, dir);
        if (!fs.statSync(contractDir).isDirectory()) continue;
        
        const jsonPath = path.join(contractDir, `${contractName}.json`);
        if (fs.existsSync(jsonPath)) {
            const artifact = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const bytecode = artifact.deployedBytecode;
            if (bytecode) {
                const bytes = (bytecode.length - 2) / 2;
                return bytes;
            }
        }
    }
    return null;
}

const contracts = [
    'UserVault',
    'VaultInfrastructureLite',
    'VaultInfrastructure',
    'VaultHubLite',
    'BadgeManager',
    'BadgeManagerLite'
];

console.log('\nContract Sizes (24,576 byte limit):');
console.log('===================================');
for (const name of contracts) {
    const size = getContractSize(name);
    if (size !== null) {
        const status = size <= 24576 ? '✓' : '✗ OVER';
        const margin = size <= 24576 ? ` (${(24576 - size).toLocaleString()} margin)` : ` (${(size - 24576).toLocaleString()} over)`;
        console.log(`${name}: ${size.toLocaleString()} bytes ${status}${margin}`);
    }
}
