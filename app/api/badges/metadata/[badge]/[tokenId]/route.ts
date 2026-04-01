import { NextRequest, NextResponse } from 'next/server'
import { getBadgeByPath, formatDuration } from '@/lib/badge-registry'
import { withRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'

function parseTokenId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw)) return null
  try {
    return BigInt(raw)
  } catch (error) {
    logger.debug('[Badge Metadata] Failed to parse tokenId', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ badge: string; tokenId: string }> }
) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { badge, tokenId } = await context.params

  const badgeMeta = getBadgeByPath(badge)
  if (!badgeMeta) {
    return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
  }

  const parsedTokenId = parseTokenId(tokenId.replace(/\.json$/i, ''))
  if (!parsedTokenId) {
    return NextResponse.json({ error: 'Invalid token id' }, { status: 400 })
  }

  const origin = request.nextUrl.origin
  const badgePath = badgeMeta.name.toLowerCase()
  const imageUrl = `${origin}/badges/art/${badgePath}.svg`

  const metadata = {
    name: `${badgeMeta.displayName} #${parsedTokenId}`,
    description: badgeMeta.description,
    image: imageUrl,
    external_url: `${origin}/badges`,
    animation_url: imageUrl,
    attributes: [
      { trait_type: 'Badge Name', value: badgeMeta.name },
      { trait_type: 'Category', value: badgeMeta.category },
      { trait_type: 'Rarity', value: badgeMeta.rarity },
      { trait_type: 'Points', value: badgeMeta.points },
      { trait_type: 'Duration', value: formatDuration(badgeMeta.duration) },
      { trait_type: 'Is Permanent', value: badgeMeta.isPermanent ? 'Yes' : 'No' },
      { trait_type: 'Token Id', value: parsedTokenId.toString() },
      { trait_type: 'Badge Id', value: badgeMeta.id },
      { trait_type: 'Earn Requirement', value: badgeMeta.earnRequirement },
    ],
  }

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
