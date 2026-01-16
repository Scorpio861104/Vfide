import { NextRequest, NextResponse } from 'next/server';

/**
 * Enterprise Orders API
 * GET - Retrieve enterprise orders/transactions
 * POST - Create a new enterprise order
 */

interface EnterpriseOrder {
  id: string;
  merchantId: string;
  merchantName: string;
  customerId?: string;
  customerEmail?: string;
  amount: string;
  currency: 'VFIDE' | 'USDC' | 'ETH';
  fiatEquivalent?: {
    amount: string;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'crypto' | 'fiat' | 'hybrid';
  metadata?: Record<string, string>;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

interface OrderStats {
  totalOrders: number;
  totalVolume: string;
  averageOrderValue: string;
  successRate: number;
  pendingOrders: number;
}

// In-memory store (use database in production)
const ordersStore: EnterpriseOrder[] = [
  {
    id: 'order_1001',
    merchantId: '0x9876543210fedcba9876543210fedcba98765432',
    merchantName: 'TechSupply Co.',
    customerId: '0x1234567890abcdef1234567890abcdef12345678',
    customerEmail: 'buyer@example.com',
    amount: '5000',
    currency: 'VFIDE',
    fiatEquivalent: { amount: '500', currency: 'USD' },
    status: 'completed',
    paymentMethod: 'crypto',
    metadata: { orderId: 'INV-2026-001', productId: 'TECH-001' },
    txHash: '0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 85800000).toISOString(),
  },
  {
    id: 'order_1002',
    merchantId: '0x9876543210fedcba9876543210fedcba98765432',
    merchantName: 'TechSupply Co.',
    customerId: '0xabcdef1234567890abcdef1234567890abcdef12',
    amount: '12500',
    currency: 'VFIDE',
    fiatEquivalent: { amount: '1250', currency: 'USD' },
    status: 'completed',
    paymentMethod: 'crypto',
    metadata: { orderId: 'INV-2026-002', productId: 'TECH-002' },
    txHash: '0xef123456789012345678901234567890123456789012345678901234567890ef',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 172200000).toISOString(),
  },
  {
    id: 'order_1003',
    merchantId: '0x9876543210fedcba9876543210fedcba98765432',
    merchantName: 'TechSupply Co.',
    amount: '3000',
    currency: 'USDC',
    fiatEquivalent: { amount: '3000', currency: 'USD' },
    status: 'pending',
    paymentMethod: 'crypto',
    metadata: { orderId: 'INV-2026-003' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'order_1004',
    merchantId: '0x9876543210fedcba9876543210fedcba98765432',
    merchantName: 'TechSupply Co.',
    customerEmail: 'enterprise@corp.com',
    amount: '50000',
    currency: 'VFIDE',
    fiatEquivalent: { amount: '5000', currency: 'USD' },
    status: 'processing',
    paymentMethod: 'crypto',
    metadata: { orderId: 'INV-2026-004', department: 'IT' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    notes: 'Bulk order for Q1 supplies',
  },
  {
    id: 'order_1005',
    merchantId: '0x9876543210fedcba9876543210fedcba98765432',
    merchantName: 'TechSupply Co.',
    amount: '7500',
    currency: 'ETH',
    fiatEquivalent: { amount: '15000', currency: 'USD' },
    status: 'completed',
    paymentMethod: 'crypto',
    txHash: '0x5678901234567890123456789012345678901234567890123456789012345678',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    completedAt: new Date(Date.now() - 258600000).toISOString(),
  },
];

function calculateStats(orders: EnterpriseOrder[]): OrderStats {
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

    let filteredOrders = [...ordersStore];

    // Filter by merchant
    if (merchantId) {
      filteredOrders = filteredOrders.filter(
        order => order.merchantId.toLowerCase() === merchantId.toLowerCase()
      );
    }

    // Filter by status
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    // Filter by currency
    if (currency) {
      filteredOrders = filteredOrders.filter(order => order.currency === currency);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filteredOrders = filteredOrders.filter(
        order => new Date(order.createdAt) >= start
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredOrders = filteredOrders.filter(
        order => new Date(order.createdAt) <= end
      );
    }

    // Sort by date (newest first)
    filteredOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate stats before pagination
    const stats = calculateStats(filteredOrders);

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      orders: paginatedOrders,
      stats,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        totalPages: Math.ceil(filteredOrders.length / limit),
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

    const newOrder: EnterpriseOrder = {
      id: `order_${Date.now()}`,
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
      createdAt: new Date().toISOString(),
      notes,
    };

    ordersStore.unshift(newOrder);

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
