const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'coverage.json');
if (!fs.existsSync(file)) {
  console.error('coverage.json not found at', file);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));

function findZeros(obj) {
  const out = [];
  for (const [filePath, meta] of Object.entries(obj)) {
    if (!meta.b || Object.keys(meta.b).length === 0) continue;
    const branchMap = meta.branchMap || {};
    for (const [bid, counts] of Object.entries(meta.b)) {
      for (let i = 0; i < counts.length; i++) {
        if (counts[i] === 0) {
          const bm = branchMap[bid] || {};
          out.push({ file: filePath, branchId: bid, locationIndex: i, counts, branchLine: bm.line || null, type: bm.type || null });
        }
      }
    }
  }
  return out;
}

const zeros = findZeros(data);
if (zeros.length === 0) {
  console.log('No branch-zero arms found (all branch arms executed at least once).');
  process.exit(0);
}

// Group by file
const byFile = zeros.reduce((acc, v) => {
  (acc[v.file] ||= []).push(v);
  return acc;
}, {});

for (const [filePath, items] of Object.entries(byFile)) {
  console.log('\n' + filePath + ':');
  for (const it of items) {
    console.log(`  branch ${it.branchId} @ line ${it.branchLine} (${it.type}) -> counts=[${it.counts.join(',')}] missing index=${it.locationIndex}`);
  }
}

console.log(`\nTotal missing branch-arms: ${zeros.length}`);
