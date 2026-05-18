/**
 * AI Product Listing — server-side proxy for Anthropic Vision.
 *
 * Background:
 *   The previous implementation in AIProductListing.tsx called
 *   https://api.anthropic.com/v1/messages directly from the browser. That
 *   approach has two problems, both of which this route fixes:
 *
 *   1. No way to authenticate without exposing the API key. Anthropic's API
 *      requires an x-api-key header. Embedding that in the browser bundle
 *      makes it readable by every visitor — they can run up the bill or
 *      use it for unrelated calls.
 *
 *   2. CORS. The Anthropic API doesn't set Access-Control-Allow-Origin for
 *      browser-originated requests outside its hosted artifact runtime, so
 *      direct fetch from a Next.js client would block at the CORS stage
 *      anyway. The catch block was silently swallowing this and falling back
 *      to placeholder text, hiding the fact that the feature was broken.
 *
 * Server-side proxy fixes both:
 *   - ANTHROPIC_API_KEY stays in environment, never reaches the browser.
 *   - The browser calls /api/ai/product-listing (same origin, no CORS).
 *
 * Input: { base64: string, mediaType?: string } — JPEG/PNG image bytes.
 * Output: { listing: { name, description, suggestedPrice, currency, category, tags[] } }
 *
 * Authentication: this route is rate-limited by user address (same pattern
 * as other API routes). Anonymous traffic is rejected. This stops a casual
 * actor from burning Anthropic credit by mass-spamming the endpoint.
 *
 * If ANTHROPIC_API_KEY is not configured, the route returns 503 with a
 * clear message so the client can render the fallback UI instead of
 * silently failing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import type { JWTPayload } from '@/lib/auth/jwt';

interface ListingResponse {
  name: string;
  description: string;
  suggestedPrice: number;
  currency: string;
  category: string;
  tags: string[];
}

const SYSTEM_PROMPT =
  'You are a product listing assistant for a marketplace serving merchants and market sellers globally. ' +
  'Analyze the product photo and return ONLY a JSON object with: name (string), description (1-2 sentences), ' +
  'suggestedPrice (number in USD), currency (string, "$"), category (string), tags (array of 3-5 discovery tags). ' +
  'No markdown, no backticks, just JSON.';

const MAX_BASE64_BYTES = 5 * 1024 * 1024; // 5MB image cap
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST = withAuth(async (request: NextRequest, _user: JWTPayload) => {
  const rateLimitResp = await withRateLimit(request, 'api');
  if (rateLimitResp) return rateLimitResp;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI listing service not configured' },
      { status: 503 }
    );
  }

  let body: { base64?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const base64 = typeof body.base64 === 'string' ? body.base64 : '';
  const mediaType = typeof body.mediaType === 'string' ? body.mediaType : 'image/jpeg';

  if (!base64) {
    return NextResponse.json({ error: 'Missing base64 image data' }, { status: 400 });
  }
  if (base64.length > (MAX_BASE64_BYTES * 4) / 3) {
    return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
  }
  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              { type: 'text', text: SYSTEM_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const status = anthropicRes.status;
      const errText = await anthropicRes.text().catch(() => '');
      logger.error('AI listing upstream error', { status, errText: errText.slice(0, 200) });
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      );
    }

    const data = await anthropicRes.json();
    const text =
      data?.content?.find?.((c: { type?: string; text?: string }) => c.type === 'text')?.text ??
      '{}';

    let listing: ListingResponse;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean) as Partial<ListingResponse>;
      listing = {
        name: typeof parsed.name === 'string' ? parsed.name.slice(0, 200) : 'Product',
        description:
          typeof parsed.description === 'string'
            ? parsed.description.slice(0, 1000)
            : '',
        suggestedPrice:
          typeof parsed.suggestedPrice === 'number' && parsed.suggestedPrice >= 0
            ? parsed.suggestedPrice
            : 0,
        currency: typeof parsed.currency === 'string' ? parsed.currency : '$',
        category: typeof parsed.category === 'string' ? parsed.category : 'General',
        tags:
          Array.isArray(parsed.tags)
            ? parsed.tags.filter((t): t is string => typeof t === 'string').slice(0, 10)
            : [],
      };
    } catch (parseErr) {
      logger.warn('AI listing JSON parse failed', { parseErr });
      return NextResponse.json(
        { error: 'AI returned malformed response' },
        { status: 502 }
      );
    }

    return NextResponse.json({ listing });
  } catch (err) {
    logger.error('AI listing proxy error', { err });
    return NextResponse.json(
      { error: 'AI service temporarily unavailable' },
      { status: 502 }
    );
  }
});
