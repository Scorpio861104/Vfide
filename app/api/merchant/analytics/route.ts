import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const PERIOD_TO_INTERVAL: Record<'7d' | '30d' | '90d', string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const merchantAddress = (searchParams.get('address') || '').trim().toLowerCase();
  const period = (searchParams.get('period') || '30d') as '7d' | '30d' | '90d';
  const normalizedPeriod: '7d' | '30d' | '90d' = period in PERIOD_TO_INTERVAL ? period : '30d';
  const interval = PERIOD_TO_INTERVAL[normalizedPeriod];

  if (!ADDRESS_LIKE_REGEX.test(merchantAddress)) {
    return NextResponse.json({ error: 'Valid merchant address required' }, { status: 400 });
  }

  if (authResult.user.address.toLowerCase() !== merchantAddress) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [summaryResult, previousSummaryResult, topProductsResult, dailyRevenueResult, expenseResult] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total::numeric), 0) AS total_revenue,
                COUNT(*) AS transaction_count
           FROM merchant_orders
          WHERE merchant_address = $1
            AND payment_status = 'paid'
            AND status <> 'cancelled'
            AND created_at >= NOW() - INTERVAL '${interval}'`,
        [merchantAddress],
      ),
      query(
        `SELECT COALESCE(SUM(total::numeric), 0) AS total_revenue
           FROM merchant_orders
          WHERE merchant_address = $1
            AND payment_status = 'paid'
            AND status <> 'cancelled'
            AND created_at < NOW() - INTERVAL '${interval}'
            AND created_at >= NOW() - (INTERVAL '${interval}' * 2)`,
        [merchantAddress],
      ),
      query(
        `SELECT oi.name,
                COALESCE(SUM(oi.total::numeric), 0) AS revenue,
                COALESCE(SUM(oi.quantity), 0) AS count
           FROM merchant_order_items oi
           JOIN merchant_orders o ON o.id = oi.order_id
          WHERE o.merchant_address = $1
            AND o.payment_status = 'paid'
            AND o.status <> 'cancelled'
            AND o.created_at >= NOW() - INTERVAL '${interval}'
          GROUP BY oi.name
          ORDER BY revenue DESC, count DESC, oi.name ASC
          LIMIT 5`,
        [merchantAddress],
      ),
      query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
                COALESCE(SUM(total::numeric), 0) AS amount
           FROM merchant_orders
          WHERE merchant_address = $1
            AND payment_status = 'paid'
            AND status <> 'cancelled'
            AND created_at >= NOW() - INTERVAL '${interval}'
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) ASC`,
        [merchantAddress],
      ),
      query(
        `SELECT COALESCE(SUM(amount::numeric), 0) AS total_expenses
           FROM merchant_expenses
          WHERE merchant_address = $1
            AND expense_date >= CURRENT_DATE - INTERVAL '${interval}'`,
        [merchantAddress],
      ),
    ]);

    const totalRevenue = roundCurrency(Number(summaryResult.rows[0]?.total_revenue ?? 0));
    const transactionCount = Number(summaryResult.rows[0]?.transaction_count ?? 0);
    const previousRevenue = roundCurrency(Number(previousSummaryResult.rows[0]?.total_revenue ?? 0));
    const averageOrderValue = transactionCount > 0 ? roundCurrency(totalRevenue / transactionCount) : 0;
    const revenueChange = previousRevenue > 0
      ? roundCurrency(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : totalRevenue > 0 ? 100 : 0;
    const totalExpenses = roundCurrency(Number(expenseResult.rows[0]?.total_expenses ?? 0));
    const netProfit = roundCurrency(totalRevenue - totalExpenses);
    const profitMargin = totalRevenue > 0 ? roundCurrency((netProfit / totalRevenue) * 100) : 0;

    return NextResponse.json({
      totalRevenue,
      transactionCount,
      averageOrderValue,
      revenueChange,
      totalExpenses,
      netProfit,
      profitMargin,
      topProducts: topProductsResult.rows.map((row) => ({
        name: String(row.name ?? 'Item'),
        revenue: roundCurrency(Number(row.revenue ?? 0)),
        count: Number(row.count ?? 0),
      })),
      dailyRevenue: dailyRevenueResult.rows.map((row) => ({
        date: String(row.date ?? ''),
        amount: roundCurrency(Number(row.amount ?? 0)),
      })),
    });
  } catch (error) {
    logger.error('[Merchant Analytics GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load merchant analytics' }, { status: 500 });
  }
}
