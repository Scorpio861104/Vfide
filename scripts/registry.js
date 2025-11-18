const fs = require('fs');
const path = require('path');

function registryPath(networkName) {
  const fname = `${networkName}.json`;
  return path.join(process.cwd(), 'deployments', fname);
}

function loadRegistry(networkName) {
  const p = registryPath(networkName);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function saveRegistry(networkName, data) {
  const p = registryPath(networkName);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function updateRegistry(networkName, name, entry) {
  const reg = loadRegistry(networkName);
  reg[name] = entry;
  saveRegistry(networkName, reg);
}

module.exports = { registryPath, loadRegistry, saveRegistry, updateRegistry };
