import fs from 'node:fs';
import path from 'node:path';

describe('Seer rollup refresh query safety', () => {
  const root = process.cwd();

  it('ensures API rollup refresh query references refresh CTE', () => {
    const filePath = path.join(root, 'app/api/seer/analytics/rollup/route.ts');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('refresh AS (');
    expect(source).toContain('CROSS JOIN refresh r');
  });

  it('ensures CLI rollup refresh query references refresh CTE', () => {
    const filePath = path.join(root, 'scripts/refresh-seer-analytics-rollup.ts');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('refresh AS (');
    expect(source).toContain('CROSS JOIN refresh r');
  });
});
