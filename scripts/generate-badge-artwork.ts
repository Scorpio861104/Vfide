import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BADGE_REGISTRY, type BadgeMetadata } from '../lib/badge-registry'

type Palette = {
  bgA: string
  bgB: string
  ring: string
  accent: string
}

const categoryPalette: Record<string, Palette> = {
  'Pioneer & Foundation': { bgA: '#322117', bgB: '#9d6b2b', ring: '#ffcc80', accent: '#ffe0b2' },
  'Activity & Participation': { bgA: '#042b37', bgB: '#117086', ring: '#58d7ff', accent: '#b9f3ff' },
  'Trust & Community': { bgA: '#2f1730', bgB: '#7c3280', ring: '#e6a9ee', accent: '#f9d8ff' },
  'Commerce & Merchants': { bgA: '#0f2f21', bgB: '#2e7f57', ring: '#8bffc2', accent: '#cbffe2' },
  'Security & Integrity': { bgA: '#231b36', bgB: '#4f3f87', ring: '#bdb4ff', accent: '#e3deff' },
  'Achievements & Milestones': { bgA: '#3d1f10', bgB: '#ba5d1f', ring: '#ffbe94', accent: '#ffe3d2' },
  'Education & Contribution': { bgA: '#13243d', bgB: '#2f5da8', ring: '#96c4ff', accent: '#d7e9ff' },
  'Headhunter Competition': { bgA: '#3b0f18', bgB: '#8a263f', ring: '#ff9db5', accent: '#ffd7e2' },
}

const DEFAULT_PALETTE: Palette = {
  bgA: '#1f2937',
  bgB: '#4b5563',
  ring: '#93c5fd',
  accent: '#e5e7eb',
}

const rarityStroke: Record<BadgeMetadata['rarity'], string> = {
  Common: '#94a3b8',
  Uncommon: '#4ade80',
  Rare: '#38bdf8',
  Epic: '#c084fc',
  Legendary: '#f59e0b',
  Mythic: '#f43f5e',
}

function slug(name: string): string {
  return name.toLowerCase()
}

function abbrev(displayName: string): string {
  const parts = displayName
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'BDG'
  return parts.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSvg(badge: BadgeMetadata): string {
  const pal = categoryPalette[badge.category] ?? DEFAULT_PALETTE
  const marker = abbrev(badge.displayName)
  const rarity = rarityStroke[badge.rarity]
  const title = escapeXml(badge.displayName)
  const category = escapeXml(badge.category)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" role="img" aria-labelledby="t d">
  <title id="t">${title}</title>
  <desc id="d">VFIDE badge artwork for ${title}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pal.bgA}" />
      <stop offset="100%" stop-color="${pal.bgB}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="52%">
      <stop offset="0%" stop-color="${pal.accent}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${pal.accent}" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <rect width="1200" height="1200" fill="url(#bg)" />
  <circle cx="600" cy="500" r="420" fill="url(#glow)" />

  <g filter="url(#shadow)">
    <circle cx="600" cy="520" r="370" fill="#0b1020" fill-opacity="0.36" stroke="${pal.ring}" stroke-width="14" />
    <circle cx="600" cy="520" r="332" fill="none" stroke="${rarity}" stroke-width="18" />
  </g>

  <text x="600" y="550" text-anchor="middle" fill="#ffffff" font-family="'Space Grotesk', 'Segoe UI', sans-serif" font-size="170" font-weight="700" letter-spacing="8">${marker}</text>

  <rect x="180" y="860" width="840" height="180" rx="24" fill="#040711" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.2" />
  <text x="600" y="935" text-anchor="middle" fill="#ffffff" font-family="'Space Grotesk', 'Segoe UI', sans-serif" font-size="58" font-weight="700">${title}</text>
  <text x="600" y="990" text-anchor="middle" fill="#dbeafe" font-family="'Space Grotesk', 'Segoe UI', sans-serif" font-size="30">${category}</text>
</svg>`
}

async function main(): Promise<void> {
  const root = process.cwd()
  const artDir = path.join(root, 'public', 'badges', 'art')
  const manifestDir = path.join(root, 'public', 'badges')

  await mkdir(artDir, { recursive: true })
  await mkdir(manifestDir, { recursive: true })

  const badges = Object.values(BADGE_REGISTRY)
  const manifest: Array<{ name: string; path: string; rarity: string; category: string }> = []

  for (const badge of badges) {
    const filename = `${slug(badge.name)}.svg`
    const filePath = path.join(artDir, filename)
    const svg = buildSvg(badge)
    await writeFile(filePath, svg, 'utf8')
    manifest.push({
      name: badge.name,
      path: `/badges/art/${filename}`,
      rarity: badge.rarity,
      category: badge.category,
    })
  }

  await writeFile(
    path.join(manifestDir, 'art-manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), total: manifest.length, badges: manifest }, null, 2),
    'utf8'
  )

  console.log(`Generated ${manifest.length} badge artworks in public/badges/art`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
