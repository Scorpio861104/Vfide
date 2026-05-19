import { describe, it, expect } from 'vitest';
import { generateCSV } from '@/components/export/csv-export';

describe('generateCSV — formula injection defense', () => {
  it('neutralizes leading = (formula trigger)', () => {
    const csv = generateCSV({
      headers: ['name', 'value'],
      rows: [['cell starts with', "=cmd|'/c calc'!A1"]],
    });
    // The malicious cell should be prefixed with ' so Excel treats it as text
    expect(csv).toContain("'=cmd|'/c calc'!A1");
    // And NOT have a bare =cmd... cell
    expect(csv).not.toMatch(/^=cmd/m);
    expect(csv).not.toContain(',=cmd');
  });

  it('neutralizes leading + (formula trigger)', () => {
    const csv = generateCSV({
      headers: ['x'],
      rows: [['+1+1']],
    });
    expect(csv).toContain("'+1+1");
  });

  it('neutralizes leading - (formula trigger)', () => {
    const csv = generateCSV({
      headers: ['x'],
      rows: [['-2-2']],
    });
    expect(csv).toContain("'-2-2");
  });

  it('neutralizes leading @ (Lotus 1-2-3 formula trigger)', () => {
    const csv = generateCSV({
      headers: ['x'],
      rows: [['@SUM(A1:A10)']],
    });
    expect(csv).toContain("'@SUM");
  });

  it('neutralizes leading tab / CR (formula prefix smuggling)', () => {
    const csv1 = generateCSV({ headers: ['x'], rows: [['\t=evil']] });
    const csv2 = generateCSV({ headers: ['x'], rows: [['\r=evil']] });
    expect(csv1).toContain("'\t=evil");
    expect(csv2).toContain("'\r=evil");
  });

  it('does not prefix safe cells with apostrophe', () => {
    const csv = generateCSV({
      headers: ['amount', 'name'],
      rows: [['100', 'Alice']],
    });
    expect(csv).not.toContain("'100");
    expect(csv).not.toContain("'Alice");
  });

  it('still escapes quote characters within cells', () => {
    const csv = generateCSV({
      headers: ['msg'],
      rows: [['He said "hello"']],
    });
    expect(csv).toContain('"He said ""hello"""');
  });

  it('still quotes cells containing commas', () => {
    const csv = generateCSV({
      headers: ['list'],
      rows: [['a, b, c']],
    });
    expect(csv).toContain('"a, b, c"');
  });

  it('handles null and undefined cells', () => {
    const csv = generateCSV({
      headers: ['a', 'b', 'c'],
      rows: [[null, undefined, 'value']],
    });
    expect(csv).toContain(',,value');
  });

  it('handles numeric cells', () => {
    const csv = generateCSV({
      headers: ['n'],
      rows: [[42, 3.14, 0]],
    });
    expect(csv).toContain('42');
    expect(csv).toContain('3.14');
  });

  it('handles malicious value disguised by leading whitespace stripped', () => {
    // After trimming, the value still starts with =. Our defense should
    // catch this since we don't trim, but the cell wouldn't trigger as
    // formula with leading space either. Test current behavior:
    const csv = generateCSV({
      headers: ['x'],
      rows: [[' =evil']],
    });
    // Leading space means it's not a formula trigger in Excel, so no prefix
    expect(csv).toContain(' =evil');
    expect(csv).not.toContain("' =evil");
  });
});
