import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const updateCustomerNoteSchema = z.object({
  customerAddress: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX),
  notes: z.string().max(4000).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
});

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return address;
}

function computeProofScore(totalSpent: number, orderCount: number): number {
  const spendScore = Math.min(60, totalSpent / 20);
  const repeatScore = Math.min(40, orderCount * 8);
  return Math.round(spendScore + repeatScore);
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;
  const queryText = (searchParams.get('q') || '').trim().toLowerCase();
  const sort = searchParams.get('sort') === 'recent' ? 'recent' : searchParams.get('sort') === 'orders' ? 'orders' : 'spent';

  const sortClause = sort === 'recent'
    ? 'base.last_visit DESC NULLS LAST, base.total_spent DESC'
    : sort === 'orders'
      ? 'base.order_count DESC, base.total_spent DESC'
      : 'base.total_spent DESC, base.last_visit DESC NULLS LAST';

  try {
    const params: Array<string | number> = [authAddress];
    let filterSql = '';

    if (queryText) {
      params.push(`%${queryText}%`);
      filterSql = `
        AND (
          LOWER(COALESCE(base.customer_name, '')) LIKE $2
          OR LOWER(base.customer_address) LIKE $2
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(notes.tags, ARRAY[]::text[])) AS tag
            WHERE LOWER(tag) LIKE $2
          )
        )`;
    }

    params.push(limit, offset);

    const customerResult = await query(
      `WITH base AS (
         SELECT
           o.customer_address,
           MAX(NULLIF(o.customer_name, '')) AS customer_name,
           COUNT(*) AS order_count,
           COALESCE(SUM(o.total::numeric), 0) AS total_spent,
           MAX(o.created_at) AS last_visit,
           MIN(o.created_at) AS first_visit
         FROM merchant_orders o
         WHERE o.merchant_address = $1
           AND o.customer_address IS NOT NULL
         GROUP BY o.customer_address
       ), favorite_products AS (
         SELECT ranked.customer_address, ranked.name AS favorite_product
         FROM (
           SELECT
             o.customer_address,
             oi.name,
             ROW_NUMBER() OVER (
               PARTITION BY o.customer_address
               ORDER BY COUNT(*) DESC, oi.name ASC
             ) AS row_number
           FROM merchant_orders o
           JOIN merchant_order_items oi ON oi.order_id = o.id
           WHERE o.merchant_address = $1
             AND o.customer_address IS NOT NULL
           GROUP BY o.customer_address, oi.name
         ) ranked
         WHERE ranked.row_number = 1
       )
       SELECT
         base.customer_address,
         base.customer_name,
         base.order_count,
         base.total_spent,
         base.last_visit,
         base.first_visit,
         favorite_products.favorite_product,
         COALESCE(notes.notes, '') AS notes,
         COALESCE(notes.tags, ARRAY[]::text[]) AS tags
       FROM base
       LEFT JOIN favorite_products ON favorite_products.customer_address = base.customer_address
       LEFT JOIN merchant_customer_notes notes
         ON notes.merchant_address = $1
        AND notes.customer_address = base.customer_address
       WHERE 1 = 1
       ${filterSql}
       ORDER BY ${sortClause}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const countParams = queryText ? [authAddress, `%${queryText}%`] : [authAddress];
    const countResult = await query(
      `WITH base AS (
         SELECT o.customer_address, MAX(NULLIF(o.customer_name, '')) AS customer_name
         FROM merchant_orders o
         WHERE o.merchant_address = $1
           AND o.customer_address IS NOT NULL
         GROUP BY o.customer_address
       )
       SELECT COUNT(*) AS total
       FROM base
       LEFT JOIN merchant_customer_notes notes
         ON notes.merchant_address = $1
        AND notes.customer_address = base.customer_address
       WHERE 1 = 1
       ${queryText ? `
         AND (
           LOWER(COALESCE(base.customer_name, '')) LIKE $2
           OR LOWER(base.customer_address) LIKE $2
           OR EXISTS (
             SELECT 1 FROM unnest(COALESCE(notes.tags, ARRAY[]::text[])) AS tag
             WHERE LOWER(tag) LIKE $2
           )
         )` : ''}`,
      countParams,
    );

    const customers = customerResult.rows.map((row) => {
      const totalSpent = Number(row.total_spent ?? 0);
      const orderCount = Number(row.order_count ?? 0);
      const tags = Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : [];

      return {
        id: String(row.customer_address ?? '').toLowerCase(),
        walletAddress: String(row.customer_address ?? '').toLowerCase(),
        name: row.customer_name ? String(row.customer_name) : null,
        phone: null,
        tags,
        totalSpent,
        orderCount,
        lastOrderAt: row.last_visit ? new Date(String(row.last_visit)).getTime() : 0,
        firstOrderAt: row.first_visit ? new Date(String(row.first_visit)).getTime() : 0,
        proofScore: computeProofScore(totalSpent, orderCount),
        notes: row.notes ? String(row.notes) : '',
        isFavorite: tags.includes('vip') || orderCount >= 5,
        favoriteProduct: row.favorite_product ? String(row.favorite_product) : null,
      };
    });

    const total = Number(countResult.rows[0]?.total ?? 0);

    return NextResponse.json({
      success: true,
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Merchant Customers GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer history' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = updateCustomerNoteSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid customer note payload' }, { status: 400 });
    }

    const { customerAddress, notes, tags } = parsedBody.data;
    const normalizedTags = Array.from(
      new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
    );

    const result = await query(
      `INSERT INTO merchant_customer_notes (
         merchant_address,
         customer_address,
         notes,
         tags,
         updated_at
       ) VALUES ($1, $2, $3, $4::text[], NOW())
       ON CONFLICT (merchant_address, customer_address)
       DO UPDATE SET
         notes = EXCLUDED.notes,
         tags = EXCLUDED.tags,
         updated_at = NOW()
       RETURNING merchant_address, customer_address, notes, tags, updated_at`,
      [authAddress, customerAddress, notes ?? '', normalizedTags],
    );

    return NextResponse.json({
      success: true,
      note: result.rows[0],
    });
  } catch (error) {
    logger.error('[Merchant Customers PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to save customer notes' }, { status: 500 });
  }
}
