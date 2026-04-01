/**
 * Merchant Storefront Profile API
 *
 * GET   — Fetch profile (public by address/slug)
 * POST  — Create storefront profile (authenticated merchant)
 * PATCH — Update profile (authenticated merchant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,58}$/;
const RESERVED_SLUGS = ['admin', 'api', 'app', 'checkout', 'dashboard', 'store', 'merchant', 'vfide'];

const merchantProfileCreateSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  slug: z.string().trim().regex(SLUG_REGEX).optional(),
  logo_url: z.string().max(2000).optional(),
  banner_url: z.string().max(2000).optional(),
  website: z.string().max(500).optional(),
  contact_email: z.string().email().max(254).optional(),
  phone: z.string().max(30).optional(),
  business_hours: z.record(z.string(), z.unknown()).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  social_links: z.record(z.string(), z.unknown()).optional(),
  theme_color: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
  shipping_enabled: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  digital_goods_enabled: z.boolean().optional(),
  services_enabled: z.boolean().optional(),
});

const merchantProfilePatchSchema = z.object({
  display_name: z.string().max(120).optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  logo_url: z.string().max(2000).optional(),
  banner_url: z.string().max(2000).optional(),
  website: z.string().max(500).optional(),
  contact_email: z.string().email().max(254).optional(),
  phone: z.string().max(30).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(2).optional(),
  theme_color: z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),
  business_hours: z.record(z.string(), z.unknown()).optional(),
  social_links: z.record(z.string(), z.unknown()).optional(),
  shipping_enabled: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  digital_goods_enabled: z.boolean().optional(),
  services_enabled: z.boolean().optional(),
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

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

// ─────────────────────────── GET: Public profile
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get('id') || searchParams.get('slug') || searchParams.get('address');

  if (!identifier) {
    return NextResponse.json({ error: 'id, slug, or address required' }, { status: 400 });
  }

  try {
    let profileResult;
    if (identifier.startsWith('0x') && ADDRESS_LIKE_REGEX.test(identifier)) {
      profileResult = await query(
        `SELECT id, merchant_address, slug, display_name, tagline, description,
                logo_url, banner_url, website, contact_email, phone,
                business_hours, address_line1, city, state_province, postal_code, country,
                social_links, theme_color, accepts_crypto,
                shipping_enabled, pickup_enabled, digital_goods_enabled, services_enabled,
                status, featured, created_at
         FROM merchant_profiles WHERE merchant_address = $1`,
        [identifier.toLowerCase()]
      );
    } else {
      profileResult = await query(
        `SELECT id, merchant_address, slug, display_name, tagline, description,
                logo_url, banner_url, website, contact_email, phone,
                business_hours, address_line1, city, state_province, postal_code, country,
                social_links, theme_color, accepts_crypto,
                shipping_enabled, pickup_enabled, digital_goods_enabled, services_enabled,
                status, featured, created_at
         FROM merchant_profiles WHERE slug = $1`,
        [identifier.toLowerCase()]
      );
    }

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileResult.rows[0];

    // Fetch product count and categories
    const merchantAddr = profile?.merchant_address as string;
    const [productCount, categories, reviewStats] = await Promise.all([
      query(
        "SELECT COUNT(*) as count FROM merchant_products WHERE merchant_address = $1 AND status = 'active'",
        [merchantAddr]
      ),
      query(
        'SELECT id, name, slug, parent_id, sort_order FROM merchant_categories WHERE merchant_address = $1 ORDER BY sort_order',
        [merchantAddr]
      ),
      query(
        `SELECT COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating
         FROM merchant_reviews WHERE merchant_address = $1 AND status = 'published'`,
        [merchantAddr]
      ),
    ]);

    return NextResponse.json({
      profile,
      product_count: Number(productCount.rows[0]?.count ?? 0),
      categories: categories.rows,
      reviews: {
        count: Number(reviewStats.rows[0]?.count ?? 0),
        avg_rating: Number(reviewStats.rows[0]?.avg_rating ?? 0),
      },
    });
  } catch (error) {
    logger.error('[Profile GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create profile
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    // Eligibility check: minimum proof score required for merchant registration
    const eligibility = await query<{ proof_score: number }>(
      'SELECT proof_score FROM users WHERE wallet_address = $1',
      [authAddress]
    );
    if (eligibility.rows.length === 0 || Number(eligibility.rows[0]?.proof_score ?? 0) < 1000) {
      return NextResponse.json(
        { error: 'Minimum proof score of 1000 required for merchant registration' },
        { status: 403 }
      );
    }

    // Check existing
    const existing = await query(
      'SELECT id FROM merchant_profiles WHERE merchant_address = $1',
      [authAddress]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Profile already exists, use PATCH to update' }, { status: 409 });
    }

    const parsedBody = merchantProfileCreateSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const body = parsedBody.data;
    const { display_name, tagline, description, slug: requestedSlug, logo_url, banner_url,
            website, contact_email, phone, business_hours, address_line1, address_line2,
            city, state_province, postal_code, country, social_links, theme_color,
            shipping_enabled, pickup_enabled, digital_goods_enabled, services_enabled } = body;

    let slug = typeof requestedSlug === 'string' ? requestedSlug : slugify(display_name.trim());

    if (RESERVED_SLUGS.includes(slug)) {
      slug = `${slug}-store`;
    }

    // Check slug uniqueness
    const slugCheck = await query('SELECT id FROM merchant_profiles WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const result = await query(
      `INSERT INTO merchant_profiles
       (merchant_address, slug, display_name, tagline, description, logo_url, banner_url,
        website, contact_email, phone, business_hours,
        address_line1, address_line2, city, state_province, postal_code, country,
        social_links, theme_color, shipping_enabled, pickup_enabled,
        digital_goods_enabled, services_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        authAddress,
        slug,
        display_name,
        tagline ?? null,
        description ?? null,
        logo_url ?? null,
        banner_url ?? null,
        website ?? null,
        contact_email ?? null,
        phone ?? null,
        business_hours ? JSON.stringify(business_hours) : null,
        address_line1 ?? null,
        address_line2 ?? null,
        city ?? null,
        state_province ?? null,
        postal_code ?? null,
        country ? country.toUpperCase() : null,
        social_links ? JSON.stringify(social_links) : null,
        theme_color ?? null,
        shipping_enabled === true,
        pickup_enabled === true,
        digital_goods_enabled === true,
        services_enabled === true,
      ]
    );

    return NextResponse.json({ profile: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Profile POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update profile
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const existing = await query(
      'SELECT id FROM merchant_profiles WHERE merchant_address = $1',
      [authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found, create one first' }, { status: 404 });
    }

    const parsedBody = merchantProfilePatchSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const body = parsedBody.data;
    const updates: string[] = ['updated_at = NOW()'];
    const params: (string | number | boolean | null)[] = [];
    let pi = 1;

    const strFields: [string, string, number][] = [
      ['display_name', 'display_name', 120],
      ['tagline', 'tagline', 200],
      ['description', 'description', 5000],
      ['logo_url', 'logo_url', 2000],
      ['banner_url', 'banner_url', 2000],
      ['website', 'website', 500],
      ['contact_email', 'contact_email', 254],
      ['phone', 'phone', 30],
      ['address_line1', 'address_line1', 200],
      ['address_line2', 'address_line2', 200],
      ['city', 'city', 100],
      ['state_province', 'state_province', 100],
      ['postal_code', 'postal_code', 20],
    ];

    for (const [bodyKey, col, maxLen] of strFields) {
      if (typeof body[bodyKey as keyof typeof body] === 'string') {
        updates.push(`${col} = $${pi++}`);
        params.push((body[bodyKey as keyof typeof body] as string).slice(0, maxLen));
      }
    }

    if (body.country !== undefined) {
      updates.push(`country = $${pi++}`);
      params.push(body.country.toUpperCase());
    }
    if (body.theme_color !== undefined) {
      updates.push(`theme_color = $${pi++}`);
      params.push(body.theme_color);
    }
    if (body.business_hours) {
      updates.push(`business_hours = $${pi++}`);
      params.push(JSON.stringify(body.business_hours));
    }
    if (body.social_links) {
      updates.push(`social_links = $${pi++}`);
      params.push(JSON.stringify(body.social_links));
    }

    if (typeof body.shipping_enabled === 'boolean') {
      updates.push(`shipping_enabled = $${pi++}`);
      params.push(body.shipping_enabled);
    }
    if (typeof body.pickup_enabled === 'boolean') {
      updates.push(`pickup_enabled = $${pi++}`);
      params.push(body.pickup_enabled);
    }
    if (typeof body.digital_goods_enabled === 'boolean') {
      updates.push(`digital_goods_enabled = $${pi++}`);
      params.push(body.digital_goods_enabled);
    }
    if (typeof body.services_enabled === 'boolean') {
      updates.push(`services_enabled = $${pi++}`);
      params.push(body.services_enabled);
    }

    params.push(authAddress);
    const result = await query(
      `UPDATE merchant_profiles SET ${updates.join(', ')} WHERE merchant_address = $${pi} RETURNING *`,
      params as (string | number | boolean | Date | null | undefined)[]
    );

    return NextResponse.json({ profile: result.rows[0] });
  } catch (error) {
    logger.error('[Profile PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
