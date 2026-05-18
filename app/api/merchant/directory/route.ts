/**
 * Merchant Directory API
 *
 * GET — Browse/search merchants (public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q');
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;

  try {
    const conditions = ["mp.status = 'active'"];
    const params: (string | number | boolean)[] = [];
    let pi = 1;

    if (search && search.length <= 100) {
      conditions.push(`to_tsvector('english', coalesce(mp.display_name,'') || ' ' || coalesce(mp.tagline,'') || ' ' || coalesce(mp.description,'')) @@ plainto_tsquery('english', $${pi})`);
      params.push(search);
      pi++;
    }
    if (category) {
      // Match merchants that have products in this category
      conditions.push(`EXISTS (
        SELECT 1 FROM merchant_categories mc
        WHERE mc.merchant_address = mp.merchant_address AND mc.slug = $${pi++}
      )`);
      params.push(category);
    }
    if (featured === 'true') {
      conditions.push('mp.featured = true');
    }

    const where = conditions.join(' AND ');

    let orderClause = 'mp.featured DESC, mp.created_at DESC';
    if (search && search.length <= 100) {
      const searchSortParamIdx = pi;
      params.push(search);
      pi += 1;
      orderClause = `ts_rank(to_tsvector('english', coalesce(mp.display_name,'') || ' ' || coalesce(mp.tagline,'') || ' ' || coalesce(mp.description,'')), plainto_tsquery('english', $${searchSortParamIdx})) DESC, mp.featured DESC`;
    }

    const [merchants, countResult] = await Promise.all([
      query(
        `SELECT mp.merchant_address, mp.slug, mp.display_name, mp.tagline,
                mp.logo_url, mp.city, mp.state_province, mp.country,
                mp.theme_color, mp.featured, mp.services_enabled, mp.digital_goods_enabled,
                mp.shipping_enabled, mp.pickup_enabled,
                (SELECT COUNT(*) FROM merchant_products p
                 WHERE p.merchant_address = mp.merchant_address AND p.status = 'active') as product_count,
                (SELECT ROUND(AVG(r.rating), 1) FROM merchant_reviews r
                 WHERE r.merchant_address = mp.merchant_address AND r.status = 'published') as avg_rating,
                (SELECT COUNT(*) FROM merchant_reviews r
                 WHERE r.merchant_address = mp.merchant_address AND r.status = 'published') as review_count
         FROM merchant_profiles mp
         WHERE ${where}
         ORDER BY ${orderClause}
         LIMIT $${pi++} OFFSET $${pi}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) as total FROM merchant_profiles mp WHERE ${where}`,
        params
      ),
    ]);

    return NextResponse.json({
      merchants: merchants.rows,
      pagination: {
        page, limit,
        total: Number(countResult.rows[0]?.total ?? 0),
        pages: Math.ceil(Number(countResult.rows[0]?.total ?? 0) / limit),
      },
    });
  } catch (error) {
    logger.error('[Directory GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch directory' }, { status: 500 });
  }
}
