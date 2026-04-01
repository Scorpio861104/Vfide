/**
 * Merchant Product Catalog API
 *
 * GET   — List products (public by merchant address/slug, or authenticated for own)
 * POST  — Create product (authenticated merchant)
 * PATCH — Update product (authenticated merchant)
 * DELETE — Archive product (authenticated merchant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,198}$/;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
}

const productImageSchema = z.object({
  url: z.string().max(2000).optional(),
  alt: z.string().max(200).optional(),
});

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional(),
  short_description: z.string().max(500).optional(),
  price: z.coerce.number().min(0).max(999999.99),
  compare_at_price: z.coerce.number().min(0).optional(),
  token_price: z.coerce.number().min(0).optional(),
  token: z.string().max(20).optional(),
  sku: z.string().max(100).optional(),
  product_type: z.enum(['physical', 'digital', 'service']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  platform_category_id: z.coerce.number().int().positive().optional(),
  images: z.array(productImageSchema).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  weight_grams: z.coerce.number().int().min(0).optional(),
  inventory_count: z.coerce.number().int().min(0).optional(),
  inventory_tracking: z.boolean().optional(),
  status: z.enum(['active', 'draft']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const patchProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(200).optional(),
  description: z.string().max(10000).optional(),
  short_description: z.string().max(500).optional(),
  sku: z.string().max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  compare_at_price: z.union([z.coerce.number().min(0), z.null()]).optional(),
  token_price: z.union([z.coerce.number().min(0), z.null()]).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  product_type: z.enum(['physical', 'digital', 'service']).optional(),
  category_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  platform_category_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  inventory_count: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  featured: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  images: z.array(productImageSchema).max(10).optional(),
});

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return address;
}

// ─────────────────────────── GET: List/search products
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const merchant = searchParams.get('merchant');
  const category = searchParams.get('category');
  const search = searchParams.get('q');
  const productType = searchParams.get('type');
  const sortBy = searchParams.get('sort'); // relevance, price_asc, price_desc, newest, best_selling, rating
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const minRating = searchParams.get('min_rating'); // 1-5
  const productId = searchParams.get('id'); // single product fetch
  const suggest = searchParams.get('suggest'); // autocomplete mode
  const platformCategory = searchParams.get('platform_category'); // platform-wide category slug
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;

  // ── Single product detail fetch
  if (productId) {
    try {
      const result = await query(
        `SELECT p.*, c.name as category_name, c.slug as category_slug,
                mp.slug as merchant_slug, mp.display_name as merchant_name,
                mp.logo_url as merchant_logo, mp.theme_color as merchant_theme,
                mp.shipping_enabled as merchant_ships,
                pc.name as platform_category_name, pc.slug as platform_category_slug,
                pcp.name as platform_parent_category_name, pcp.slug as platform_parent_category_slug,
                (SELECT COALESCE(AVG(r.rating), 0) FROM merchant_reviews r WHERE r.product_id = p.id AND r.status = 'published') as avg_rating,
                (SELECT COUNT(*) FROM merchant_reviews r WHERE r.product_id = p.id AND r.status = 'published') as review_count,
                (SELECT json_agg(json_build_object('id', v.id, 'name', v.name, 'sku', v.sku, 'price_override', v.price_override, 'inventory_count', v.inventory_count, 'attributes', v.attributes, 'status', v.status) ORDER BY v.sort_order)
                 FROM merchant_product_variants v WHERE v.product_id = p.id AND v.status = 'active') as variants
         FROM merchant_products p
         LEFT JOIN merchant_categories c ON p.category_id = c.id
         LEFT JOIN merchant_profiles mp ON p.merchant_address = mp.merchant_address
         LEFT JOIN platform_categories pc ON p.platform_category_id = pc.id
         LEFT JOIN platform_categories pcp ON pc.parent_id = pcp.id
         WHERE p.id = $1 AND p.status = 'active'`,
        [productId]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      // Increment view count (fire-and-forget)
      query('UPDATE merchant_products SET view_count = view_count + 1 WHERE id = $1', [productId]).catch((err: unknown) => {
        logger.warn('[products] view_count increment failed:', err);
      });

      // Fetch related products (same category or merchant, exclude self)
      const product = result.rows[0] as Record<string, unknown>;
      const relatedResult = await query(
        `SELECT p.id, p.name, p.slug, p.price, p.compare_at_price, p.images, p.product_type,
                p.sold_count, mp.slug as merchant_slug, mp.display_name as merchant_name,
                (SELECT COALESCE(AVG(r.rating), 0) FROM merchant_reviews r WHERE r.product_id = p.id AND r.status = 'published') as avg_rating,
                (SELECT COUNT(*) FROM merchant_reviews r WHERE r.product_id = p.id AND r.status = 'published') as review_count
         FROM merchant_products p
         LEFT JOIN merchant_profiles mp ON p.merchant_address = mp.merchant_address
         WHERE p.id != $1 AND p.status = 'active'
           AND (p.category_id = $2 OR p.merchant_address = $3)
         ORDER BY p.sold_count DESC, p.featured DESC
         LIMIT 12`,
        [productId, (product.category_id as number) ?? null, product.merchant_address as string]
      );

      return NextResponse.json({ product, related: relatedResult.rows });
    } catch (error) {
      logger.error('[Products GET detail] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
  }

  // ── Search suggestions (autocomplete via FTS + ILIKE fallback)
  if (suggest && suggest.length >= 2 && suggest.length <= 50) {
    try {
      const result = await query(
        `SELECT DISTINCT ON (p.name) p.name, p.slug, p.price, p.product_type, p.merchant_address,
                mp.slug as merchant_slug,
                ts_rank(
                  to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.short_description,'')),
                  plainto_tsquery('english', $1)
                ) as rank
         FROM merchant_products p
         LEFT JOIN merchant_profiles mp ON p.merchant_address = mp.merchant_address
         WHERE p.status = 'active'
           AND (
             to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.short_description,''))
               @@ plainto_tsquery('english', $1)
             OR p.name ILIKE $2
             OR $1 = ANY(p.tags)
           )
         ORDER BY p.name, rank DESC, p.sold_count DESC
         LIMIT 8`,
        [suggest, `%${suggest}%`]
      );
      return NextResponse.json({ suggestions: result.rows });
    } catch (error) {
      logger.debug('[Products GET suggest] Failed to build suggestions', error);
      return NextResponse.json({ suggestions: [] });
    }
  }

  try {
    const conditions = ["p.status = 'active'"];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    // Optional: scope to a single merchant
    if (merchant) {
      if (!ADDRESS_LIKE_REGEX.test(merchant) && !SLUG_REGEX.test(merchant)) {
        return NextResponse.json({ error: 'Invalid merchant parameter' }, { status: 400 });
      }
      let merchantAddress = merchant.toLowerCase();
      if (!merchant.startsWith('0x')) {
        const profileResult = await query(
          'SELECT merchant_address FROM merchant_profiles WHERE slug = $1',
          [merchant]
        );
        if (profileResult.rows.length === 0) {
          return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }
        merchantAddress = profileResult.rows[0]?.merchant_address as string;
      }
      conditions.push(`p.merchant_address = $${paramIdx++}`);
      params.push(merchantAddress);
    }

    if (category) {
      conditions.push(`c.slug = $${paramIdx++}`);
      params.push(category);
    }
    // Platform-wide category filter (includes subcategories)
    if (platformCategory) {
      conditions.push(`(pc.slug = $${paramIdx} OR pcp.slug = $${paramIdx++})`);
      params.push(platformCategory);
    }
    if (productType && ['physical', 'digital', 'service'].includes(productType)) {
      conditions.push(`p.product_type = $${paramIdx++}`);
      params.push(productType);
    }
    if (search && search.length <= 100) {
      conditions.push(`to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.short_description,'')) @@ plainto_tsquery('english', $${paramIdx++})`);
      params.push(search);
    }

    // When searching by text, compute relevance rank for sorting
    const hasSearch = search && search.length <= 100;
    if (minPrice && !isNaN(Number(minPrice)) && Number(minPrice) >= 0) {
      conditions.push(`p.price >= $${paramIdx++}`);
      params.push(Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice)) && Number(maxPrice) > 0) {
      conditions.push(`p.price <= $${paramIdx++}`);
      params.push(Number(maxPrice));
    }
    if (minRating && ['1','2','3','4','5'].includes(minRating)) {
      conditions.push(`COALESCE(rs.avg_rating, 0) >= $${paramIdx++}`);
      params.push(Number(minRating));
    }

    const where = conditions.join(' AND ');

    // Sort order — use ts_rank() for relevance when text search is active
    // Use parameterized query for search term to prevent SQL injection
    let orderClause: string;
    if (hasSearch) {
      params.push(search!);
      const searchParamIdx = paramIdx++;
      orderClause = `ts_rank(to_tsvector('english', coalesce(p.name,'') || ' ' || coalesce(p.description,'') || ' ' || coalesce(p.short_description,'')), plainto_tsquery('english', $${searchParamIdx})) DESC, p.featured DESC, p.sold_count DESC`;
    } else {
      orderClause = 'p.featured DESC, p.sort_order, p.created_at DESC';
    }
    switch (sortBy) {
      case 'price_asc': orderClause = 'p.price ASC'; break;
      case 'price_desc': orderClause = 'p.price DESC'; break;
      case 'newest': orderClause = 'p.created_at DESC'; break;
      case 'best_selling': orderClause = 'p.sold_count DESC, p.created_at DESC'; break;
      case 'rating': orderClause = 'avg_rating DESC NULLS LAST, p.sold_count DESC'; break;
    }

    params.push(limit, offset);

    const [products, countResult] = await Promise.all([
      query(
        `SELECT p.id, p.name, p.slug, p.short_description, p.description, p.price, p.compare_at_price,
                p.currency, p.token_price, p.token, p.product_type, p.images,
                p.tags, p.featured, p.sold_count, p.view_count, p.status, p.merchant_address,
                p.inventory_count, p.track_inventory, p.created_at,
                c.name as category_name, c.slug as category_slug,
                mp.slug as merchant_slug, mp.display_name as merchant_name,
                pc.slug as platform_category_slug, pc.name as platform_category_name,
                COALESCE(rs.avg_rating, 0) as avg_rating,
                COALESCE(rs.review_count, 0) as review_count
         FROM merchant_products p
         LEFT JOIN merchant_categories c ON p.category_id = c.id
         LEFT JOIN merchant_profiles mp ON p.merchant_address = mp.merchant_address
         LEFT JOIN platform_categories pc ON p.platform_category_id = pc.id
         LEFT JOIN platform_categories pcp ON pc.parent_id = pcp.id
         LEFT JOIN LATERAL (
           SELECT AVG(r.rating)::numeric as avg_rating, COUNT(*)::int as review_count
           FROM merchant_reviews r
           WHERE r.product_id = p.id AND r.status = 'published'
         ) rs ON true
         WHERE ${where}
         ORDER BY ${orderClause}
         LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
        params
      ),
      query(
        `SELECT COUNT(*) as total FROM merchant_products p
         LEFT JOIN merchant_categories c ON p.category_id = c.id
         LEFT JOIN platform_categories pc ON p.platform_category_id = pc.id
         LEFT JOIN platform_categories pcp ON pc.parent_id = pcp.id
         LEFT JOIN LATERAL (
           SELECT AVG(r.rating)::numeric as avg_rating
           FROM merchant_reviews r
           WHERE r.product_id = p.id AND r.status = 'published'
         ) rs ON true
         WHERE ${where}`,
        params.slice(0, -2)
      ),
    ]);

    // Aggregate facets for the current filter set (price range + type distribution)
    const facetResult = await query(
      `SELECT
         MIN(p.price)::numeric as min_price,
         MAX(p.price)::numeric as max_price,
         COUNT(*) FILTER (WHERE p.product_type = 'physical') as physical_count,
         COUNT(*) FILTER (WHERE p.product_type = 'digital') as digital_count,
         COUNT(*) FILTER (WHERE p.product_type = 'service') as service_count
       FROM merchant_products p
       LEFT JOIN merchant_categories c ON p.category_id = c.id
       LEFT JOIN platform_categories pc ON p.platform_category_id = pc.id
       LEFT JOIN platform_categories pcp ON pc.parent_id = pcp.id
       WHERE ${where}`,
      params.slice(0, -2)
    );

    return NextResponse.json({
      products: products.rows,
      pagination: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
        pages: Math.ceil(Number(countResult.rows[0]?.total ?? 0) / limit),
      },
      facets: facetResult.rows[0] ?? null,
    });
  } catch (error) {
    logger.error('[Products GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create product
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = createProductSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { name, description, short_description, price, compare_at_price,
            token_price, token, sku, product_type, category_id, platform_category_id,
            images, tags, weight_grams, inventory_count, inventory_tracking,
            status: productStatus, metadata } = body;

    const slug = slugify(name.trim());
    const type = product_type || 'physical';
    const stat = productStatus || 'active';

    // Verify category ownership if provided
    if (category_id !== undefined) {
      const catCheck = await query(
        'SELECT id FROM merchant_categories WHERE id = $1 AND merchant_address = $2',
        [category_id, authAddress]
      );
      if (catCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    // Limit products per merchant
    const countResult = await query(
      'SELECT COUNT(*) as count FROM merchant_products WHERE merchant_address = $1',
      [authAddress]
    );
    if (Number(countResult.rows[0]?.count) >= 500) {
      return NextResponse.json({ error: 'Maximum 500 products per merchant' }, { status: 400 });
    }

    // Validate images array
    const safeImages = (images || []).slice(0, 10).map((img, i: number) => ({
      url: img.url || '',
      alt: img.alt || '',
      sort_order: i,
    }));

    const safeTags = (tags || []).slice(0, 20);

    const result = await query(
      `INSERT INTO merchant_products
       (merchant_address, category_id, platform_category_id, name, slug, description, short_description,
        price, compare_at_price, token_price, token, sku, product_type,
        images, tags, weight_grams, inventory_count, inventory_tracking, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        authAddress,
        category_id ?? null,
        platform_category_id ?? null,
        name.trim(),
        slug,
        description ?? null,
        short_description ?? null,
        price,
        typeof compare_at_price === 'number' ? compare_at_price : null,
        typeof token_price === 'number' ? token_price : null,
        token ?? null,
        sku ?? null,
        type,
        JSON.stringify(safeImages),
        safeTags,
        typeof weight_grams === 'number' ? Math.floor(weight_grams) : null,
        typeof inventory_count === 'number' ? inventory_count : null,
        inventory_tracking === true,
        stat,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return NextResponse.json({ product: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Products POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update product
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = patchProductSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { id } = body;

    const existing = await query(
      'SELECT id FROM merchant_products WHERE id = $1 AND merchant_address = $2',
      [id, authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: (string | number | boolean | null | string[])[] = [];
    let pi = 1;

    if (typeof body.name === 'string') {
      updates.push(`name = $${pi++}`);
      params.push(body.name.slice(0, 200));
      updates.push(`slug = $${pi++}`);
      params.push(slugify(body.name.slice(0, 200)));
    }
    if (typeof body.description === 'string') {
      updates.push(`description = $${pi++}`);
      params.push(body.description.slice(0, 10000));
    }
    if (typeof body.short_description === 'string') {
      updates.push(`short_description = $${pi++}`);
      params.push(body.short_description.slice(0, 500));
    }
    if (typeof body.sku === 'string') {
      updates.push(`sku = $${pi++}`);
      params.push(body.sku.slice(0, 100));
    }
    if (typeof body.price === 'number' && body.price >= 0) {
      updates.push(`price = $${pi++}`); params.push(body.price as number);
    }
    if (typeof body.compare_at_price === 'number' || body.compare_at_price === null) {
      updates.push(`compare_at_price = $${pi++}`); params.push(body.compare_at_price as number | null);
    }
    if (typeof body.token_price === 'number' || body.token_price === null) {
      updates.push(`token_price = $${pi++}`); params.push(body.token_price as number | null);
    }
    if (typeof body.status === 'string' && ['active', 'draft', 'archived'].includes(body.status as string)) {
      updates.push(`status = $${pi++}`); params.push(body.status as string);
    }
    if (typeof body.product_type === 'string' && ['physical', 'digital', 'service'].includes(body.product_type as string)) {
      updates.push(`product_type = $${pi++}`); params.push(body.product_type as string);
    }
    if (typeof body.category_id === 'number' || body.category_id === null) {
      updates.push(`category_id = $${pi++}`); params.push(body.category_id as number | null);
    }
    if (typeof body.platform_category_id === 'number' || body.platform_category_id === null) {
      updates.push(`platform_category_id = $${pi++}`); params.push(body.platform_category_id as number | null);
    }
    if (typeof body.inventory_count === 'number' || body.inventory_count === null) {
      updates.push(`inventory_count = $${pi++}`); params.push(body.inventory_count as number | null);
    }
    if (typeof body.featured === 'boolean') {
      updates.push(`featured = $${pi++}`); params.push(body.featured as boolean);
    }
    if (typeof body.sort_order === 'number') {
      updates.push(`sort_order = $${pi++}`); params.push(body.sort_order as number);
    }
    if (Array.isArray(body.tags)) {
      const safeTags = (body.tags as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 20);
      updates.push(`tags = $${pi++}`); params.push(safeTags);
    }
    if (Array.isArray(body.images)) {
      const safeImages = (body.images as unknown[]).slice(0, 10).map((img: unknown, i: number) => ({
        url: typeof (img as Record<string, unknown>)?.url === 'string'
          ? ((img as Record<string, unknown>).url as string).slice(0, 2000) : '',
        alt: typeof (img as Record<string, unknown>)?.alt === 'string'
          ? ((img as Record<string, unknown>).alt as string).slice(0, 200) : '',
        sort_order: i,
      }));
      updates.push(`images = $${pi++}`); params.push(JSON.stringify(safeImages) as unknown as string);
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_products SET ${updates.join(', ')} WHERE id = $${pi} RETURNING *`,
      params as (string | number | boolean | Date | null | undefined)[]
    );

    return NextResponse.json({ product: result.rows[0] });
  } catch (error) {
    logger.error('[Products PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// ─────────────────────────── DELETE: Archive product
export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const result = await query(
      "UPDATE merchant_products SET status = 'archived', updated_at = NOW() WHERE id = $1 AND merchant_address = $2 RETURNING id",
      [id, authAddress]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Products DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 });
  }
}
