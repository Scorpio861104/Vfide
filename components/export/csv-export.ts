/**
 * CSV Export — Client-side CSV generation and download
 * 
 * No server needed. Generates CSV in browser, triggers download.
 * 
 * Usage:
 *   import { exportCSV } from '@/components/export/csv-export';
 *   
 *   exportCSV({
 *     filename: 'transactions-2025',
 *     headers: ['Date', 'From', 'To', 'Amount', 'Status'],
 *     rows: transactions.map(tx => [tx.date, tx.from, tx.to, tx.amount, tx.status]),
 *   });
 * 
 * Or use the component:
 *   <ExportCSVButton data={data} filename="my-data" />
 */

export interface CSVExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  // N-H8 FIX: Prevent CSV/Spreadsheet formula injection by neutralizing cells that
  // begin with formula trigger characters.
  const str = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV({ headers, rows }: Omit<CSVExportOptions, 'filename'>): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function exportCSV({ filename, headers, rows }: CSVExportOptions): void {
  const csv = generateCSV({ headers, rows });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Pre-built export configs ────────────────────────────────────────────────

export function exportTransactions(transactions: {
  id: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  status: string;
  timestamp: number;
  memo?: string;
}[]): void {
  exportCSV({
    filename: `vfide-transactions-${new Date().toISOString().slice(0, 10)}`,
    headers: ['ID', 'Date', 'From', 'To', 'Amount (VFIDE)', 'Type', 'Status', 'Memo'],
    rows: transactions.map(tx => [
      tx.id,
      new Date(tx.timestamp).toISOString(),
      tx.from,
      tx.to,
      tx.amount,
      tx.type,
      tx.status,
      tx.memo || '',
    ]),
  });
}

export function exportProducts(products: {
  id: string;
  name: string;
  price: string;
  product_type: string;
  status: string;
}[]): void {
  exportCSV({
    filename: `vfide-products-${new Date().toISOString().slice(0, 10)}`,
    headers: ['ID', 'Name', 'Price', 'Type', 'Status'],
    rows: products.map(p => [p.id, p.name, p.price, p.product_type, p.status]),
  });
}

export function exportLeaderboard(entries: {
  address: string;
  score: number;
  tier: string;
  badges: number;
  rank: number;
}[]): void {
  exportCSV({
    filename: `vfide-leaderboard-${new Date().toISOString().slice(0, 10)}`,
    headers: ['Rank', 'Address', 'ProofScore', 'Tier', 'Badges'],
    rows: entries.map(e => [e.rank, e.address, e.score, e.tier, e.badges]),
  });
}
