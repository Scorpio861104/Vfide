import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

const MAX_EXPORT_DATE_RANGE_DAYS = 366;
const MAX_EXPORT_DATE_RANGE_MS = MAX_EXPORT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
const MAX_EXPORT_FILTER_VALUES = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// ==================== TYPES ====================

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    types: string[];
    tokens: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  includeMetadata: boolean;
  includeFees: boolean;
  includeUsdValue: boolean;
  taxFormat?: 'basic' | 'turbotax' | 'cointracker' | 'koinly';
}

interface Transaction {
  id: string;
  hash: string;
  type: string;
  from_address: string;
  to_address: string;
  token_symbol: string;
  amount: string;
  usd_value: string | null;
  fee: string | null;
  status: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

// ==================== FORMATTERS ====================

function formatAsCSV(
  transactions: Transaction[],
  options: ExportOptions
): string {
  // Build header based on options
  const headers = ['Date', 'Type', 'From', 'To', 'Token', 'Amount'];
  if (options.includeUsdValue) headers.push('USD Value');
  if (options.includeFees) headers.push('Fee (ETH)', 'Fee (USD)');
  headers.push('Status', 'Transaction Hash');
  if (options.includeMetadata) headers.push('Memo');

  // Tax software specific formats
  if (options.taxFormat === 'turbotax') {
    return formatTurboTaxCSV(transactions, options);
  } else if (options.taxFormat === 'cointracker') {
    return formatCoinTrackerCSV(transactions, options);
  } else if (options.taxFormat === 'koinly') {
    return formatKoinlyCSV(transactions, options);
  }

  const rows = transactions.map((tx) => {
    const row = [
      new Date(tx.timestamp).toISOString(),
      tx.type,
      tx.from_address,
      tx.to_address,
      tx.token_symbol || 'ETH',
      tx.amount,
    ];
    if (options.includeUsdValue) row.push(tx.usd_value || '');
    if (options.includeFees) {
      row.push(tx.fee || '0');
      row.push(''); // Fee in USD - would need price lookup
    }
    row.push(tx.status);
    row.push(tx.hash);
    if (options.includeMetadata) {
      const memo = tx.metadata && typeof tx.metadata === 'object' 
        ? (tx.metadata as Record<string, unknown>).memo || ''
        : '';
      row.push(String(memo));
    }
    return row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function formatTurboTaxCSV(transactions: Transaction[], _options: ExportOptions): string {
  const headers = [
    'Currency Name',
    'Purchase Date',
    'Cost Basis',
    'Date Sold',
    'Proceeds',
  ];

  const rows = transactions.map((tx) => {
    const date = new Date(tx.timestamp).toLocaleDateString('en-US');
    return [
      tx.token_symbol || 'ETH',
      tx.type === 'receive' ? date : '',
      tx.type === 'receive' ? tx.usd_value || '0' : '',
      tx.type === 'send' ? date : '',
      tx.type === 'send' ? tx.usd_value || '0' : '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function formatCoinTrackerCSV(transactions: Transaction[], _options: ExportOptions): string {
  const headers = [
    'Date',
    'Received Quantity',
    'Received Currency',
    'Sent Quantity',
    'Sent Currency',
    'Fee Amount',
    'Fee Currency',
    'Tag',
  ];

  const rows = transactions.map((tx) => {
    const date = new Date(tx.timestamp).toISOString();
    return [
      date,
      tx.type === 'receive' ? tx.amount : '',
      tx.type === 'receive' ? tx.token_symbol || 'ETH' : '',
      tx.type === 'send' ? tx.amount : '',
      tx.type === 'send' ? tx.token_symbol || 'ETH' : '',
      tx.fee || '',
      tx.fee ? 'ETH' : '',
      tx.type,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function formatKoinlyCSV(transactions: Transaction[], _options: ExportOptions): string {
  const headers = [
    'Date',
    'Sent Amount',
    'Sent Currency',
    'Received Amount',
    'Received Currency',
    'Fee Amount',
    'Fee Currency',
    'Net Worth Amount',
    'Net Worth Currency',
    'Label',
    'Description',
    'TxHash',
  ];

  const rows = transactions.map((tx) => {
    const date = new Date(tx.timestamp).toISOString();
    const memo = tx.metadata && typeof tx.metadata === 'object'
      ? (tx.metadata as Record<string, unknown>).memo || ''
      : '';
    return [
      date,
      tx.type === 'send' ? tx.amount : '',
      tx.type === 'send' ? tx.token_symbol || 'ETH' : '',
      tx.type === 'receive' ? tx.amount : '',
      tx.type === 'receive' ? tx.token_symbol || 'ETH' : '',
      tx.fee || '',
      tx.fee ? 'ETH' : '',
      tx.usd_value || '',
      'USD',
      tx.type,
      String(memo),
      tx.hash,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function formatAsJSON(
  transactions: Transaction[],
  options: ExportOptions
): string {
  const formatted = transactions.map((tx) => {
    const base: Record<string, unknown> = {
      date: tx.timestamp,
      type: tx.type,
      from: tx.from_address,
      to: tx.to_address,
      token: tx.token_symbol || 'ETH',
      amount: tx.amount,
      status: tx.status,
      hash: tx.hash,
    };

    if (options.includeUsdValue && tx.usd_value) {
      base.usdValue = tx.usd_value;
    }

    if (options.includeFees && tx.fee) {
      base.fee = tx.fee;
    }

    if (options.includeMetadata && tx.metadata) {
      base.metadata = tx.metadata;
    }

    return base;
  });

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      totalTransactions: transactions.length,
      dateRange: options.dateRange,
      transactions: formatted,
    },
    null,
    2
  );
}

async function formatAsPDF(
  transactions: Transaction[],
  options: ExportOptions,
  address: string
): Promise<string> {
  // For PDF, we generate an HTML string that will be rendered as PDF
  // In production, use a library like puppeteer or jspdf
  const rows = transactions
    .slice(0, 1000) // Limit for PDF
    .map(
      (tx) => `
    <tr>
      <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
      <td>${tx.type}</td>
      <td>${tx.token_symbol || 'ETH'}</td>
      <td>${tx.amount}</td>
      ${options.includeUsdValue ? `<td>$${tx.usd_value || '0'}</td>` : ''}
      <td>${tx.status}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Transaction History Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    .header { margin-bottom: 20px; }
    .meta { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Transaction History</h1>
    <p class="meta">
      Address: ${address}<br>
      Date Range: ${options.dateRange.start} to ${options.dateRange.end}<br>
      Exported: ${new Date().toISOString()}<br>
      Total Transactions: ${transactions.length}
    </p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Token</th>
        <th>Amount</th>
        ${options.includeUsdValue ? '<th>USD Value</th>' : ''}
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
  `;
}

function getContentType(format: string): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'text/html'; // Would be application/pdf with proper PDF generation
    default:
      return 'application/octet-stream';
  }
}

// ==================== ROUTE HANDLER ====================

export async function POST(request: NextRequest) {
  // Rate limiting: 10 exports per hour
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const address = body.address;
    const options = body.options;

    if (typeof address !== 'string' || address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    if (!isRecord(options)) {
      return NextResponse.json(
        { error: 'Invalid export options' },
        { status: 400 }
      );
    }

    if (options.format !== 'csv' && options.format !== 'json' && options.format !== 'pdf') {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      );
    }

    if (typeof options.includeMetadata !== 'boolean' || typeof options.includeFees !== 'boolean' || typeof options.includeUsdValue !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid export options' },
        { status: 400 }
      );
    }

    const dateRange = options.dateRange;
    const filters = options.filters;

    if (!isRecord(dateRange) || typeof dateRange.start !== 'string' || typeof dateRange.end !== 'string') {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    if (!isRecord(filters) || !Array.isArray(filters.types) || !Array.isArray(filters.tokens)) {
      return NextResponse.json(
        { error: 'Invalid filters' },
        { status: 400 }
      );
    }

    if (
      filters.types.length > MAX_EXPORT_FILTER_VALUES ||
      filters.tokens.length > MAX_EXPORT_FILTER_VALUES
    ) {
      return NextResponse.json(
        { error: `Too many filter values. Maximum ${MAX_EXPORT_FILTER_VALUES} per filter.` },
        { status: 400 }
      );
    }

    if (
      !filters.types.every((value) => typeof value === 'string') ||
      !filters.tokens.every((value) => typeof value === 'string')
    ) {
      return NextResponse.json(
        { error: 'Invalid filters' },
        { status: 400 }
      );
    }

    if (
      filters.minAmount !== undefined &&
      (typeof filters.minAmount !== 'number' || !Number.isFinite(filters.minAmount))
    ) {
      return NextResponse.json(
        { error: 'Invalid minimum amount filter' },
        { status: 400 }
      );
    }

    if (
      filters.maxAmount !== undefined &&
      (typeof filters.maxAmount !== 'number' || !Number.isFinite(filters.maxAmount))
    ) {
      return NextResponse.json(
        { error: 'Invalid maximum amount filter' },
        { status: 400 }
      );
    }

    if (
      typeof filters.minAmount === 'number' &&
      typeof filters.maxAmount === 'number' &&
      filters.minAmount > filters.maxAmount
    ) {
      return NextResponse.json(
        { error: 'Invalid amount range: minAmount must be less than or equal to maxAmount' },
        { status: 400 }
      );
    }

    const validatedOptions: ExportOptions = {
      format: options.format,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end,
      },
      filters: {
        types: filters.types,
        tokens: filters.tokens,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
      },
      includeMetadata: options.includeMetadata,
      includeFees: options.includeFees,
      includeUsdValue: options.includeUsdValue,
      taxFormat:
        options.taxFormat === 'basic' ||
        options.taxFormat === 'turbotax' ||
        options.taxFormat === 'cointracker' ||
        options.taxFormat === 'koinly'
          ? options.taxFormat
          : undefined,
    };

    // Validate address matches authenticated user
    if (address.toLowerCase() !== authResult.user.address.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only export your own transactions' },
        { status: 403 }
      );
    }

    // Parse and validate date range
    const startDate = new Date(validatedOptions.dateRange.start);
    const endDate = new Date(validatedOptions.dateRange.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'Invalid date range: end date must be on or after start date' },
        { status: 400 }
      );
    }

    if (endDate.getTime() - startDate.getTime() > MAX_EXPORT_DATE_RANGE_MS) {
      return NextResponse.json(
        { error: `Date range too large. Maximum ${MAX_EXPORT_DATE_RANGE_DAYS} days allowed.` },
        { status: 400 }
      );
    }

    // Build query
    let queryText = `
      SELECT 
        t.id,
        t.hash,
        t.type,
        t.from_address,
        t.to_address,
        t.token_symbol,
        t.amount::text,
        t.usd_value::text,
        t.fee::text,
        t.status,
        t.timestamp,
        t.metadata
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE u.wallet_address = $1
        AND t.timestamp >= $2
        AND t.timestamp <= $3
    `;

    const queryParams: (string | Date | number)[] = [
      address.toLowerCase(),
      startDate,
      endDate,
    ];

    // Add type filter if not 'all'
    if (validatedOptions.filters.types.length > 0 && !validatedOptions.filters.types.includes('all')) {
      queryText += ` AND t.type = ANY($${queryParams.length + 1})`;
      queryParams.push(validatedOptions.filters.types as unknown as string);
    }

    // Add token filter if not 'all'
    if (validatedOptions.filters.tokens.length > 0 && !validatedOptions.filters.tokens.includes('all')) {
      queryText += ` AND t.token_symbol = ANY($${queryParams.length + 1})`;
      queryParams.push(validatedOptions.filters.tokens as unknown as string);
    }

    // Add amount filters
    if (validatedOptions.filters.minAmount !== undefined) {
      queryText += ` AND t.amount >= $${queryParams.length + 1}`;
      queryParams.push(validatedOptions.filters.minAmount);
    }

    if (validatedOptions.filters.maxAmount !== undefined) {
      queryText += ` AND t.amount <= $${queryParams.length + 1}`;
      queryParams.push(validatedOptions.filters.maxAmount);
    }

    queryText += ' ORDER BY t.timestamp DESC LIMIT 50000'; // Max 50k transactions

    const result = await query(queryText, queryParams);
    const transactions = result.rows as Transaction[];

    // Format based on export type
    let formattedData: string;
    switch (validatedOptions.format) {
      case 'csv':
        formattedData = formatAsCSV(transactions, validatedOptions);
        break;
      case 'json':
        formattedData = formatAsJSON(transactions, validatedOptions);
        break;
      case 'pdf':
        formattedData = await formatAsPDF(transactions, validatedOptions, address);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

    const filename = `transactions-${new Date().toISOString().split('T')[0]}.${validatedOptions.format}`;

    return new Response(formattedData, {
      headers: {
        'Content-Type': getContentType(validatedOptions.format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Export API] Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to export transactions';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
