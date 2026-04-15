import fs from 'node:fs'
import path from 'node:path'

type Finding = {
  file: string
  line: number
  source: string
}

const SCAN_DIRECTORIES = ['hooks', 'components', 'lib', 'app']
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/
const EXCLUDED_SEGMENTS = ['node_modules', '.next', 'artifacts', 'cache', 'coverage', 'playwright-report', 'test-results']
const ALLOWED_FILES = new Set<string>([
  'lib/contracts.ts',
  'lib/constants.ts',
])

const FORBIDDEN_PATTERNS = [
  /CONTRACT_ADDRESSES\.[A-Za-z0-9_]+\s*(?:===|!==|==|!=)\s*ZERO_ADDRESS/g,
  /ZERO_ADDRESS\s*(?:===|!==|==|!=)\s*CONTRACT_ADDRESSES\.[A-Za-z0-9_]+/g,
]

function shouldSkipDirectory(entryName: string): boolean {
  return EXCLUDED_SEGMENTS.includes(entryName) || entryName.startsWith('.')
}

function collectFiles(root: string, relativeDir: string): string[] {
  const fullDir = path.join(root, relativeDir)
  if (!fs.existsSync(fullDir)) {
    return []
  }

  const results: string[] = []
  const entries = fs.readdirSync(fullDir, { withFileTypes: true })

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        results.push(...collectFiles(root, relativePath))
      }
      continue
    }

    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      results.push(relativePath)
    }
  }

  return results
}

function getLineNumber(content: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') {
      line += 1
    }
  }
  return line
}

function scanFile(root: string, relativePath: string): Finding[] {
  if (ALLOWED_FILES.has(relativePath.replace(/\\/g, '/'))) {
    return []
  }

  const absolutePath = path.join(root, relativePath)
  const content = fs.readFileSync(absolutePath, 'utf8')
  const findings: Finding[] = []

  for (const pattern of FORBIDDEN_PATTERNS) {
    pattern.lastIndex = 0
    let match = pattern.exec(content)

    while (match) {
      const line = getLineNumber(content, match.index)
      const source = content.split('\n')[line - 1]?.trim() ?? ''
      findings.push({ file: relativePath.replace(/\\/g, '/'), line, source })
      match = pattern.exec(content)
    }
  }

  return findings
}

function main(): void {
  const root = process.cwd()
  const files = SCAN_DIRECTORIES.flatMap((dir) => collectFiles(root, dir))
  const findings = files.flatMap((file) => scanFile(root, file))

  if (findings.length === 0) {
    console.log('Frontend contract guardrails passed: no raw ZERO_ADDRESS comparisons against CONTRACT_ADDRESSES found.')
    return
  }

  console.error('Frontend contract guardrails failed: use isConfiguredContractAddress(...) instead of comparing CONTRACT_ADDRESSES directly to ZERO_ADDRESS.')
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.source}`)
  }

  process.exitCode = 1
}

main()