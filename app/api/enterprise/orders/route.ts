import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';

/**
 * Enterprise Orders API - PostgreSQL Database
 * GET - Retrieve enterprise orders/transactions from database
 * POST - Create a new enterprise order in database
 */

interface OrderRow {
  id: number;
  merchant_address: string;
  merchant_name: string;
  customer_address: string | null;
  customer_email: string | null;
  amount: string;
  currency: string;
  fiat_amount: string | null;
  fiat_currency: string | null;
  status: string;
  payment_method: string;
  metadata: Record<string, string> | null;
  tx_hash: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

interface OrderStats {
  totalOrders: number;
  totalVolume: string;
  averageOrderValue: string;
  successRate: number;
  pendingOrders: number;
}

function calculateStats(orders: OrderRow[]): OrderStats {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
  
  const totalVolume = orders.reduce((sum, o) => sum + parseFloat(o.amount), 0);
  const avgValue = orders.length > 0 ? totalVolume / orders.length : 0;
  const successRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;

  return {
    totalOrders: orders.length,
    totalVolume: totalVolume.toFixed(2),
    averageOrderValue: avgValue.toFixed(2),
    successRate: Math.round(successRate),
    pendingOrders: pendingOrders.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const status = searchParams.get('status');
    const currency = searchParams.get('currency');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const offset = (page - 1) * limit;

    // Build dynamic query
    let queryText = `
      SELECT 
        id,
        merchant_address,
        COALESCE(merchant_name, 'Unknown Merchant') as merchant_name,
        customer_address,
        customer_email,
        amount,
        currency,
        fiat_amount,
        fiat_currency,
        status,
        COALESCE(payment_method, 'crypto') as payment_method,
        metadata,
        tx_hash,
        notes,
        created_at,
        completed_at
      FROM enterprise_orders
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (merchantId) {
      params.push(merchantId.toLowerCase());
      queryText += ` AND LOWER(merchant_address) = $${paramIndex++}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND status = $${paramIndex++}`;
    }

    if (currency) {
      params.push(currency);
      queryText += ` AND currency = $${paramIndex++}`;
    }

    if (startDate) {
      params.push(startDate);
      queryText += ` AND created_at >= $${paramIndex++}::timestamp`;
    }

    if (endDate) {
      params.push(endDate);
      queryText += ` AND created_at <= $${paramIndex++}::timestamp`;
    }

    // Get all matching orders for stats (before pagination)
    const statsResult = await query<OrderRow>(queryText, params);
    const stats = calculateStats(statsResult.rows);

    // Add pagination
    queryText += ` ORDER BY created_at DESC`;
    params.push(limit);
    queryText += ` LIMIT $${paramIndex++}`;
    params.push(offset);
    queryText += ` OFFSET $${paramIndex}`;

    const result = await query<OrderRow>(queryText, params);

    const orders = result.rows.map(row => ({
      id: `order_${row.id}`,
      merchantId: row.merchant_address,
      merchantName: row.merchant_name,
      customerId: row.customer_address,
      customerEmail: row.customer_email,
      amount: row.amount,
      currency: row.currency as 'VFIDE' | 'USDC' | 'ETH',
      fiatEquivalent: row.fiat_amount && row.fiat_currency ? {
        amount: row.fiat_amount,
        currency: row.fiat_currency as 'USD' | 'EUR' | 'GBP',
      } : undefined,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
      paymentMethod: row.payment_method as 'crypto' | 'fiat' | 'hybrid',
      metadata: row.metadata,
      txHash: row.tx_hash,
      notes: row.notes,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));

    return NextResponse.json({
      orders,
      stats,
      pagination: {
        page,
        limit,
        total: statsResult.rows.length,
        totalPages: Math.ceil(statsResult.rows.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient();

  try {
    const body = await request.json();
    const { 
      merchantId, 
      merchantName, 
      customerId, 
      customerEmail,
      amount, 
      currency, 
      fiatEquivalent,
      paymentMethod,
      metadata,
      notes 
    } = body;

    if (!merchantId || !amount || !currency) {
      return NextResponse.json(
        { error: 'merchantId, amount, and currency are required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    const orderResult = await client.query<{ id: number; created_at: string }>(
      `INSERT INTO enterprise_orders (
        merchant_address, 
        merchant_name, 
        customer_address, 
        customer_email,
        amount, 
        currency, 
        fiat_amount,
        fiat_currency,
        status,
        payment_method,
        metadata,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at`,
      [
        merchantId.toLowerCase(),
        merchantName || 'Unknown Merchant',
        customerId?.toLowerCase() || null,
        customerEmail || null,
        amount.toString(),
        currency,
        fiatEquivalent?.amount || null,
        fiatEquivalent?.currency || null,
        'pending',
        paymentMethod || 'crypto',
        metadata ? JSON.stringify(metadata) : null,
        notes || null,
      ]
    );

    await client.query('COMMIT');

    const orderRow = orderResult.rows[0];
    if (!orderRow) {
      throw new Error('Failed to insert order');
    }

    const newOrder = {
      id: `order_${orderRow.id}`,
      merchantId,
      merchantName: merchantName || 'Unknown Merchant',
      customerId,
      customerEmail,
      amount: amount.toString(),
      currency,
      fiatEquivalent,
      status: 'pending',
      paymentMethod: paymentMethod || 'crypto',
      metadata,
      createdAt: orderRow.created_at,
      notes,
    };

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const client = await getClient();
  
  try {
    const body = await request.json();
    const { orderId, merchantId, status, txHash, notes, completedAt } = body;

    if (!orderId || !merchantId) {
      return NextResponse.json(
        { error: 'orderId and merchantId are required' },
        { status: 400 }
      );
    }

    const numericId = parseInt(orderId.replace('order_', ''));

    await client.query('BEGIN');

    // Verify merchant ownership
    const ownerCheck = await client.query<{ merchant_address: string }>(
      'SELECT merchant_address FROM enterprise_orders WHERE id = $1',
      [numericId]
    );

    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderOwner = ownerCheck.rows[0];
    if (!orderOwner || orderOwner.merchant_address.toLowerCase() !== merchantId.toLowerCase()) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update query
    const updates: string[] = [];
    const params: (string | null | number)[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (txHash !== undefined) {
      updates.push(`tx_hash = $${paramIndex++}`);
      params.push(txHash);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      params.push(completedAt);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    params.push(numericId);
    
    await client.query(
      `UPDATE enterprise_orders SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    await client.query('COMMIT');

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await getClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const merchantId = searchParams.get('merchantId');

    if (!orderId || !merchantId) {
      return NextResponse.json(
        { error: 'orderId and merchantId are required' },
        { status: 400 }
      );
    }

    const numericId = parseInt(orderId.replace('order_', ''));

    await client.query('BEGIN');

    // Verify ownership and check status
    const ownerCheck = await client.query<{ merchant_address: string; status: string }>(
      'SELECT merchant_address, status FROM enterprise_orders WHERE id = $1',
      [numericId]
    );

    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderOwner = ownerCheck.rows[0];
    if (!orderOwner || orderOwner.merchant_address.toLowerCase() !== merchantId.toLowerCase()) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow cancellation of pending orders
    if (!['pending', 'processing'].includes(orderOwner.status)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Can only cancel pending or processing orders' },
        { status: 400 }
      );
    }

    await client.query(
      'UPDATE enterprise_orders SET status = $1 WHERE id = $2',
      ['cancelled', numericId]
    );

    await client.query('COMMIT');

    return NextResponse.json({ success: true, cancelled: orderId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
