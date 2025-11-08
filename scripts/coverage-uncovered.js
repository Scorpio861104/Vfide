const fs = require('fs');
const path = require('path');
const covPath = path.resolve(__dirname, '../coverage.json');
if (!fs.existsSync(covPath)) {
  console.error('coverage.json not found at', covPath);
  process.exit(1);
}
const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
const files = Object.keys(cov).filter(f => f.includes('contracts-min'));
for (const f of files) {
  const data = cov[f];
  const b = data.b || {};
  const branchMap = data.branchMap || {};
  const uncovered = [];
  for (const bid of Object.keys(b)) {
    const hits = b[bid];
    for (let i = 0; i < hits.length; i++) {
      if (hits[i] === 0) {
        const bm = branchMap[bid];
        const loc = (bm && bm.locations && bm.locations[i]) ? bm.locations[i] : (bm && bm.location) ? bm.location : null;
        const line = loc ? (loc.start ? loc.start.line : (loc.line || 'unknown')) : 'unknown';
        const type = bm && bm.type ? bm.type : 'unknown';
        uncovered.push({ branch: bid, loc: i, line, type, raw: bm });
      }
    }
  }
  console.log(`\nFile: ${f}`);
  console.log(`Uncovered branches: ${uncovered.length}`);
  if (uncovered.length > 0) {
    // sort by line
    uncovered.sort((a,b)=> (a.line==='unknown'?1:0) - (b.line==='unknown'?1:0) || (a.line-b.line));
    uncovered.slice(0, 200).forEach(u => {
      console.log(`  branch ${u.branch} @loc ${u.loc} line:${u.line} type:${u.type}`);
    });
  }
}
console.log('\nDone');
