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

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,58}$/;
const RESERVED_SLUGS = ['admin', 'api', 'app', 'checkout', 'dashboard', 'store', 'merchant', 'vfide'];

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
    console.error('[Profile GET] Error:', error);
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
    // Check existing
    const existing = await query(
      'SELECT id FROM merchant_profiles WHERE merchant_address = $1',
      [authAddress]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Profile already exists, use PATCH to update' }, { status: 409 });
    }

    const body = await request.json() as Record<string, unknown>;
    const { display_name, tagline, description, slug: requestedSlug, logo_url, banner_url,
            website, contact_email, phone, business_hours, address_line1, address_line2,
            city, state_province, postal_code, country, social_links, theme_color,
            shipping_enabled, pickup_enabled, digital_goods_enabled, services_enabled } = body;

    if (typeof display_name !== 'string' || display_name.trim().length === 0) {
      return NextResponse.json({ error: 'display_name required' }, { status: 400 });
    }

    let slug = typeof requestedSlug === 'string' && SLUG_REGEX.test(requestedSlug)
      ? requestedSlug : slugify(display_name.trim());

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
        (display_name as string).trim().slice(0, 120),
        typeof tagline === 'string' ? tagline.slice(0, 200) : null,
        typeof description === 'string' ? description.slice(0, 5000) : null,
        typeof logo_url === 'string' ? logo_url.slice(0, 2000) : null,
        typeof banner_url === 'string' ? banner_url.slice(0, 2000) : null,
        typeof website === 'string' ? website.slice(0, 500) : null,
        typeof contact_email === 'string' ? contact_email.slice(0, 254) : null,
        typeof phone === 'string' ? phone.slice(0, 30) : null,
        business_hours && typeof business_hours === 'object' ? JSON.stringify(business_hours) : null,
        typeof address_line1 === 'string' ? address_line1.slice(0, 200) : null,
        typeof address_line2 === 'string' ? address_line2.slice(0, 200) : null,
        typeof city === 'string' ? city.slice(0, 100) : null,
        typeof state_province === 'string' ? state_province.slice(0, 100) : null,
        typeof postal_code === 'string' ? postal_code.slice(0, 20) : null,
        typeof country === 'string' ? country.slice(0, 2).toUpperCase() : null,
        social_links && typeof social_links === 'object' ? JSON.stringify(social_links) : null,
        typeof theme_color === 'string' && /^#[a-fA-F0-9]{6}$/.test(theme_color) ? theme_color : null,
        shipping_enabled === true,
        pickup_enabled === true,
        digital_goods_enabled === true,
        services_enabled === true,
      ]
    );

    return NextResponse.json({ profile: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[Profile POST] Error:', error);
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

    const body = await request.json() as Record<string, unknown>;
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
      if (typeof body[bodyKey] === 'string') {
        updates.push(`${col} = $${pi++}`);
        params.push((body[bodyKey] as string).slice(0, maxLen));
      }
    }

    if (typeof body.country === 'string') {
      updates.push(`country = $${pi++}`);
      params.push((body.country as string).slice(0, 2).toUpperCase());
    }
    if (typeof body.theme_color === 'string' && /^#[a-fA-F0-9]{6}$/.test(body.theme_color as string)) {
      updates.push(`theme_color = $${pi++}`);
      params.push(body.theme_color as string);
    }
    if (body.business_hours && typeof body.business_hours === 'object') {
      updates.push(`business_hours = $${pi++}`);
      params.push(JSON.stringify(body.business_hours));
    }
    if (body.social_links && typeof body.social_links === 'object') {
      updates.push(`social_links = $${pi++}`);
      params.push(JSON.stringify(body.social_links));
    }

    const boolFields = ['shipping_enabled', 'pickup_enabled', 'digital_goods_enabled', 'services_enabled'];
    for (const field of boolFields) {
      if (typeof body[field] === 'boolean') {
        updates.push(`${field} = $${pi++}`);
        params.push(body[field] as boolean);
      }
    }

    params.push(authAddress);
    const result = await query(
      `UPDATE merchant_profiles SET ${updates.join(', ')} WHERE merchant_address = $${pi} RETURNING *`,
      params as (string | number | boolean | Date | null | undefined)[]
    );

    return NextResponse.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('[Profile PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
