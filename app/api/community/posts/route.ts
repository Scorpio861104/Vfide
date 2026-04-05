import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT p.*, u.name as author_name, u.proof_score as author_score
       FROM community_posts p LEFT JOIN users u ON p.author_address = u.address
       ORDER BY p.created_at DESC LIMIT 50`
    );
    return NextResponse.json({ posts: result.rows });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorAddress, content, imageUrl } = body;
    if (!authorAddress || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const result = await query(
      `INSERT INTO community_posts (author_address, content, image_url) VALUES ($1, $2, $3) RETURNING *`,
      [authorAddress.toLowerCase(), content, imageUrl || null]
    );
    return NextResponse.json({ post: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
