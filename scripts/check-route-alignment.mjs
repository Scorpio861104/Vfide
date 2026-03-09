#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, 'app')
const SCAN_DIRS = ['app', 'components']

const FILE_EXT_RE = /\.(ts|tsx|js|jsx)$/
const PAGE_FILE_RE = /\/page\.(ts|tsx|js|jsx)$/
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/

const REF_RE = /\bhref\s*=\s*['"]([^'"]+)['"]|\b(?:href|path)\s*:\s*['"]([^'"]+)['"]|\b(?:navigate|push|replace)\(\s*['"]([^'"]+)['"]\s*\)/g

const ALLOWED_PREFIXES = ['/api/', '/v1/']
const ALLOWED_ASSET_PATHS = new Set([
  '/favicon.ico',
  '/icon.svg',
  '/og-image.png',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
])

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, out)
    } else {
      out.push(fullPath)
    }
  }
  return out
}

function normalizeRoute(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/').replace(PAGE_FILE_RE, '')
  if (!rel) return '/'
  return `/${rel.replace(/\/index$/, '')}`
}

function routeToRegex(route) {
  const escaped = route
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\[\.\.\.[^/\]]+\\\]/g, '.+')
    .replace(/\\\[[^/\]]+\\\]/g, '[^/]+')
  return new RegExp(`^${escaped}$`)
}

function shouldIgnore(ref) {
  if (!ref || !ref.startsWith('/')) return true
  if (ref.startsWith('//')) return true
  if (ALLOWED_PREFIXES.some((prefix) => ref.startsWith(prefix))) return true
  if (ALLOWED_ASSET_PATHS.has(ref)) return true
  return false
}

function collectRoutes() {
  const files = walk(APP_DIR).filter((f) => PAGE_FILE_RE.test(f))
  const routes = new Set(['/'])
  for (const file of files) {
    routes.add(normalizeRoute(file))
  }
  return routes
}

function collectRefs() {
  const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir))).filter((f) => FILE_EXT_RE.test(f))
  const refs = []

  for (const file of files) {
    if (file.includes(`${path.sep}__tests__${path.sep}`) || TEST_FILE_RE.test(file)) {
      continue
    }

    const text = fs.readFileSync(file, 'utf8')
    let match
    while ((match = REF_RE.exec(text)) !== null) {
      const raw = (match[1] || match[2] || match[3] || '').trim()
      if (!raw) continue
      if (/^(https?:|mailto:|tel:|#)/i.test(raw)) continue

      const cleaned = raw.split('?')[0].split('#')[0]
      if (shouldIgnore(cleaned)) continue

      refs.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        ref: cleaned,
      })
    }
  }

  return refs
}

function main() {
  const routes = collectRoutes()
  const routeRegexes = [...routes].map((route) => ({
    route,
    regex: routeToRegex(route),
  }))

  const missing = []
  for (const item of collectRefs()) {
    const exact = routes.has(item.ref)
    const dynamic = routeRegexes.some(({ regex }) => regex.test(item.ref))
    if (!exact && !dynamic) {
      missing.push(item)
    }
  }

  if (missing.length === 0) {
    console.log('Route alignment check passed: no missing internal route references found.')
    process.exit(0)
  }

  console.error(`Route alignment check failed: ${missing.length} missing internal route reference(s).`)
  const grouped = new Map()
  for (const item of missing) {
    if (!grouped.has(item.file)) grouped.set(item.file, [])
    grouped.get(item.file).push(item.ref)
  }

  for (const [file, refs] of grouped.entries()) {
    const uniqueRefs = [...new Set(refs)].sort()
    console.error(`- ${file}`)
    for (const ref of uniqueRefs) {
      console.error(`  - ${ref}`)
    }
  }

  process.exit(1)
}

main()
