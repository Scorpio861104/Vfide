const solc = require('solc');
const fs = require('fs');
const path = require('path');

console.log('Solidity compiler version:', solc.version());

function findImports(importPath) {
  const contractsPath = path.join(__dirname, '../home/runner/work/Vfide/Vfide/contracts-min');
  const fullPath = path.join(contractsPath, importPath);
  try {
    return { contents: fs.readFileSync(fullPath, 'utf8') };
  } catch (e) {
    return { error: 'File not found: ' + importPath };
  }
}

const contractsPath = '/home/runner/work/Vfide/Vfide/contracts-min';
const outputPath = '/home/runner/work/Vfide/Vfide/artifacts';

// Read all contract files
const sources = {};
const files = fs.readdirSync(contractsPath);

files.forEach(file => {
  if (file.endsWith('.sol')) {
    const filePath = path.join(contractsPath, file);
    sources[file] = { content: fs.readFileSync(filePath, 'utf8') };
  }
});

// Read mocks
const mocksPath = path.join(contractsPath, 'mocks');
if (fs.existsSync(mocksPath)) {
  const mockFiles = fs.readdirSync(mocksPath);
  mockFiles.forEach(file => {
    if (file.endsWith('.sol')) {
      const filePath = path.join(mocksPath, file);
      sources['mocks/' + file] = { content: fs.readFileSync(filePath, 'utf8') };
    }
  });
}

console.log('Compiling contracts:', Object.keys(sources));

const input = {
  language: 'Solidity',
  sources: sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  output.errors.forEach(error => {
    console.error(error.formattedMessage);
  });
  if (output.errors.some(e => e.severity === 'error')) {
    process.exit(1);
  }
}

// Create artifacts directory
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

// Save artifacts
Object.keys(output.contracts).forEach(file => {
  Object.keys(output.contracts[file]).forEach(contractName => {
    const contract = output.contracts[file][contractName];
    const artifact = {
      "_format": "hh-sol-artifact-1",
      "contractName": contractName,
      "sourceName": file,
      "abi": contract.abi,
      "bytecode": "0x" + contract.evm.bytecode.object,
      "deployedBytecode": "0x" + contract.evm.deployedBytecode.object,
      "linkReferences": contract.evm.bytecode.linkReferences || {},
      "deployedLinkReferences": contract.evm.deployedBytecode.linkReferences || {}
    };
    
    const artifactDir = path.join(outputPath, 'contracts-min', file.replace('.sol', '.sol'));
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(
      path.join(artifactDir, contractName + '.json'),
      JSON.stringify(artifact, null, 2)
    );
    console.log('Generated artifact for:', contractName);
  });
});

console.log('Compilation complete!');
