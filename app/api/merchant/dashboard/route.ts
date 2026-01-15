import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { validateAddress, createErrorResponse } from '@/lib/inputValidation';

/**
 * GET /api/merchant/dashboard?userAddress=0x...
 * Get merchant dashboard data (stats, recent transactions, etc.)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    const validatedAddress = validateAddress(userAddress);

    const client = await getClient();

    try {
      // Get merchant info
      const merchantResult = await client.query(
        `SELECT m.*, u.wallet_address, u.username
         FROM merchants m
         JOIN users u ON m.user_id = u.id
         WHERE u.wallet_address = $1`,
        [validatedAddress]
      );

      if (merchantResult.rows.length === 0) {
        return NextResponse.json(
          createErrorResponse('Merchant not found'),
          { status: 404 }
        );
      }

      const merchant = merchantResult.rows[0];

      // Get transaction statistics
      const statsResult = await client.query(
        `SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= NOW() - INTERVAL '30 days' THEN amount ELSE 0 END), 0) as revenue_30_days,
          COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= NOW() - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as revenue_7_days
         FROM merchant_transactions
         WHERE merchant_id = $1`,
        [merchant.id]
      );

      // Get recent transactions
      const recentTransactionsResult = await client.query(
        `SELECT 
          mt.*,
          u.wallet_address as customer_address,
          u.username as customer_username
         FROM merchant_transactions mt
         LEFT JOIN users u ON mt.customer_id = u.id
         WHERE mt.merchant_id = $1
         ORDER BY mt.created_at DESC
         LIMIT 10`,
        [merchant.id]
      );

      // Get monthly revenue trend (last 6 months)
      const revenueTrendResult = await client.query(
        `SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as transaction_count,
          COALESCE(SUM(amount), 0) as total_amount
         FROM merchant_transactions
         WHERE merchant_id = $1 
           AND status = 'completed'
           AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month DESC`,
        [merchant.id]
      );

      return NextResponse.json({
        merchant: {
          id: merchant.id,
          businessName: merchant.business_name,
          businessType: merchant.business_type,
          status: merchant.status,
          contactEmail: merchant.contact_email,
          websiteUrl: merchant.website_url,
          createdAt: merchant.created_at,
        },
        stats: statsResult.rows[0],
        recentTransactions: recentTransactionsResult.rows,
        revenueTrend: revenueTrendResult.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Merchant Dashboard API] Error:', error);
    return NextResponse.json(
      createErrorResponse(error as Error),
      { status: 500 }
    );
  }
}
