/**
 * Crypto API Routes - Transactions Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock transactions storage
const transactionsStore = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const transactions = transactionsStore.get(userId.toLowerCase()) || [];

    return NextResponse.json({
      success: true,
      transactions: transactions.sort((a, b) => b.timestamp - a.timestamp),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const transaction = await request.json();

    // Store transaction for both sender and receiver
    const fromTxs = transactionsStore.get(transaction.from.toLowerCase()) || [];
    const toTxs = transactionsStore.get(transaction.to.toLowerCase()) || [];

    fromTxs.push(transaction);
    toTxs.push(transaction);

    transactionsStore.set(transaction.from.toLowerCase(), fromTxs);
    transactionsStore.set(transaction.to.toLowerCase(), toTxs);

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save transaction' },
      { status: 500 }
    );
  }
}
