/**
 * Platform Categories API — Global category taxonomy
 *
 * GET — List all platform categories with product counts (public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const parentSlug = searchParams.get('parent'); // filter to children of this slug
  const withCounts = searchParams.get('counts') !== 'false'; // include product counts (default true)

  try {
    let result;

    if (parentSlug) {
      // Get children of a specific parent
      result = await query(
        `SELECT pc.id, pc.parent_id, pc.name, pc.slug, pc.icon, pc.description, pc.sort_order,
                ${withCounts ? `(SELECT COUNT(*) FROM merchant_products p WHERE p.platform_category_id = pc.id AND p.status = 'active')::int as product_count,` : ''}
                (SELECT COUNT(*) FROM platform_categories child WHERE child.parent_id = pc.id AND child.status = 'active')::int as child_count
         FROM platform_categories pc
         WHERE pc.parent_id = (SELECT id FROM platform_categories WHERE slug = $1)
           AND pc.status = 'active'
         ORDER BY pc.sort_order, pc.name`,
        [parentSlug]
      );
    } else {
      // Get the full tree (top-level + their children)
      result = await query(
        `SELECT pc.id, pc.parent_id, pc.name, pc.slug, pc.icon, pc.description, pc.sort_order,
                ${withCounts ? `(SELECT COUNT(*) FROM merchant_products p WHERE (p.platform_category_id = pc.id OR p.platform_category_id IN (SELECT c.id FROM platform_categories c WHERE c.parent_id = pc.id)) AND p.status = 'active')::int as product_count,` : ''}
                (SELECT COUNT(*) FROM platform_categories child WHERE child.parent_id = pc.id AND child.status = 'active')::int as child_count
         FROM platform_categories pc
         WHERE pc.status = 'active'
         ORDER BY pc.parent_id NULLS FIRST, pc.sort_order, pc.name`,
        []
      );
    }

    // Organize into a tree structure for easy frontend consumption
    const all = result.rows as Array<{
      id: number; parent_id: number | null; name: string; slug: string;
      icon: string | null; description: string | null; sort_order: number;
      product_count?: number; child_count: number;
    }>;

    const topLevel = all.filter(c => c.parent_id === null);
    const children = all.filter(c => c.parent_id !== null);

    const tree = topLevel.map(parent => ({
      ...parent,
      children: children.filter(c => c.parent_id === parent.id),
    }));

    return NextResponse.json({ categories: tree, all });
  } catch (error) {
    logger.error('[Platform Categories GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
