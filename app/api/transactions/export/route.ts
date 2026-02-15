import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

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
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [612, 792]; // Letter
  const margin = 40;
  const fontSize = 10;
  const lineHeight = fontSize + 4;

  let page = pdfDoc.addPage(pageSize);
  let y = page.getHeight() - margin;

  const drawText = (text: string, x: number, yPos: number, size = fontSize, bold = false) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  const addPageIfNeeded = () => {
    if (y <= margin + lineHeight) {
      page = pdfDoc.addPage(pageSize);
      y = page.getHeight() - margin;
    }
  };

  drawText('Transaction History Export', margin, y, 16, true);
  y -= lineHeight * 2;
  drawText(`Address: ${address}`, margin, y);
  y -= lineHeight;
  drawText(`Date Range: ${options.dateRange.start} to ${options.dateRange.end}`, margin, y);
  y -= lineHeight;
  drawText(`Exported: ${new Date().toISOString()}`, margin, y);
  y -= lineHeight;
  drawText(`Total Transactions: ${transactions.length}`, margin, y);
  y -= lineHeight * 2;

  const columns = [
    { label: 'Date', width: 90 },
    { label: 'Type', width: 70 },
    { label: 'Token', width: 60 },
    { label: 'Amount', width: 90 },
    ...(options.includeUsdValue ? [{ label: 'USD Value', width: 80 }] : []),
    { label: 'Status', width: 80 },
  ];

  const drawRow = (values: string[], isHeader = false) => {
    let x = margin;
    values.forEach((value, index) => {
      drawText(value, x, y, fontSize, isHeader);
      x += columns[index]?.width ?? 0;
    });
    y -= lineHeight;
    addPageIfNeeded();
  };

  drawRow(columns.map((col) => col.label), true);
  y -= 2;

  const rows = transactions.slice(0, 1000).map((tx) => {
    const row = [
      new Date(tx.timestamp).toLocaleDateString(),
      tx.type,
      tx.token_symbol || 'ETH',
      tx.amount,
    ];
    if (options.includeUsdValue) {
      row.push(tx.usd_value ? `$${tx.usd_value}` : '');
    }
    row.push(tx.status);
    return row;
  });

  rows.forEach((row) => {
    drawRow(row);
  });

  return pdfDoc.save();
}

function getContentType(format: string): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'application/pdf';
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

  try {
    const body = await request.json();
    const { address, options } = body as { address: string; options: ExportOptions };

    // Validate address matches authenticated user
    if (address.toLowerCase() !== authResult.user.address.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only export your own transactions' },
        { status: 403 }
      );
    }

    // Parse and validate date range
    const startDate = new Date(options.dateRange.start);
    const endDate = new Date(options.dateRange.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date range' },
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
    if (options.filters.types.length > 0 && !options.filters.types.includes('all')) {
      queryText += ` AND t.type = ANY($${queryParams.length + 1})`;
      queryParams.push(options.filters.types as unknown as string);
    }

    // Add amount filters
    if (options.filters.minAmount !== undefined) {
      queryText += ` AND t.amount >= $${queryParams.length + 1}`;
      queryParams.push(options.filters.minAmount);
    }

    if (options.filters.maxAmount !== undefined) {
      queryText += ` AND t.amount <= $${queryParams.length + 1}`;
      queryParams.push(options.filters.maxAmount);
    }

    queryText += ' ORDER BY t.timestamp DESC LIMIT 50000'; // Max 50k transactions

    const result = await query(queryText, queryParams);
    const transactions = result.rows as Transaction[];

    // Format based on export type
    let formattedData: string | Uint8Array;
    switch (options.format) {
      case 'csv':
        formattedData = formatAsCSV(transactions, options);
        break;
      case 'json':
        formattedData = formatAsJSON(transactions, options);
        break;
      case 'pdf':
        formattedData = await formatAsPDF(transactions, options, address);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

    const filename = `transactions-${new Date().toISOString().split('T')[0]}.${options.format}`;

    const responseBody =
      options.format === 'pdf'
        ? Buffer.from(formattedData as Uint8Array)
        : (formattedData as string);

    return new Response(responseBody, {
      headers: {
        'Content-Type': getContentType(options.format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Export API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
