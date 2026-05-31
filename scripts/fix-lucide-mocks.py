#!/usr/bin/env python3
"""
Mass-fix corrupt lucide-react mock pattern in test files.

Corrupt pattern:
    jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
      const __orig = {
      const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
      return {
        Shield: Icon,
        ...
      };
    };
      return new Proxy(__orig, { ... });
    })());

Valid replacement: remove the stray `const __orig = {` line, and convert the
inner `};` (closing the `return { ... }`) so that the function returns the
plain icon mapping which is then wrapped by Proxy via `__orig` reference.

The simplest valid fix: keep the structure but rebuild it as:
    jest.mock('lucide-react', () => (() => {
      const Icon = ({ className }: { className?: string }) => {
        const React = require('react');
        return React.createElement('span', { className }, 'icon');
      };
      const __orig: Record<string, any> = {
        Shield: Icon,
        ...
      };
      return new Proxy(__orig, { ... });
    })());
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')

# Regex to capture the entire broken block.
# Pattern: starts with `jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */`
# Followed by `  const __orig = {`
# Followed by `  const Icon = ...`
# Followed by `  return {`
# ... icon entries ...
# Followed by `  };`
# Followed by `};`
# Followed by `  return new Proxy(__orig, { ... });`
# Followed by `})());`

BROKEN_RE = re.compile(
    r"jest\.mock\(['\"]lucide-react['\"],\s*\(\)\s*=>\s*\(\(\)\s*=>\s*\{[^\n]*\n"
    r"\s*const __orig = \{\s*\n"
    r"\s*const Icon = \(\{ className \}: \{ className\?: string \}\) => <span className=\{className\}>icon</span>;\s*\n"
    r"\s*return \{\s*\n"
    r"((?:[^\n]*\n)*?)"   # group 1: icon entries
    r"\s*\};\s*\n"
    r"\};\s*\n"
    r"(\s*return new Proxy\(__orig,[^\n]*\n"
    r"(?:[^\n]*\n)*?"
    r"\s*\}\);\s*\n)"
    r"\}\)\(\)\);",
    re.MULTILINE,
)


def build_fixed_block(icon_entries: str, proxy_block: str) -> str:
    return (
        "jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */\n"
        "  const Icon = ({ className }: { className?: string }) => {\n"
        "    const React = require('react');\n"
        "    return React.createElement('span', { className }, 'icon');\n"
        "  };\n"
        "  const __orig: Record<string, any> = {\n"
        + icon_entries
        + "  };\n"
        + proxy_block
        + "})());"
    )


def fix_file(path: str) -> bool:
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    if "const __orig = {" not in src:
        return False

    new_src, count = BROKEN_RE.subn(
        lambda m: build_fixed_block(m.group(1), m.group(2)), src
    )

    if count == 0:
        # Try a simpler heuristic fix line-by-line for any non-matching variants
        return manual_fix(path, src)

    if new_src != src:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_src)
        print(f"FIXED (regex): {path}")
        return True
    return False


def manual_fix(path: str, src: str) -> bool:
    """Line-based fallback: find the broken block and reconstruct."""
    lines = src.split('\n')
    out = []
    i = 0
    fixed = False
    while i < len(lines):
        line = lines[i]
        # Detect the start: jest.mock('lucide-react', () => (() => {
        if (
            "jest.mock('lucide-react'" in line
            and i + 3 < len(lines)
            and lines[i + 1].strip() == "const __orig = {"
            and lines[i + 2].strip().startswith("const Icon = ({ className }")
            and lines[i + 3].strip() == "return {"
        ):
            # Find the end of icon entries: line "  };" then line "};"
            j = i + 4
            icon_entries = []
            while j < len(lines):
                stripped = lines[j].strip()
                if stripped == "};":
                    # Possibly the inner `  };` (closing `return {`)
                    # Next line should be `};`
                    if j + 1 < len(lines) and lines[j + 1].strip() == "};":
                        break
                icon_entries.append(lines[j])
                j += 1
            if j >= len(lines):
                # Couldn't parse, give up on this block
                out.append(line)
                i += 1
                continue
            # j points at the inner "  };", j+1 at "};"
            # Then the proxy block starts at j+2
            k = j + 2
            proxy_lines = []
            while k < len(lines):
                proxy_lines.append(lines[k])
                if lines[k].rstrip().endswith("})());"):
                    break
                k += 1
            if k >= len(lines):
                out.append(line)
                i += 1
                continue

            # Reconstruct
            out.append("jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */")
            out.append("  const Icon = ({ className }: { className?: string }) => {")
            out.append("    const React = require('react');")
            out.append("    return React.createElement('span', { className }, 'icon');")
            out.append("  };")
            out.append("  const __orig: Record<string, any> = {")
            # Strip excess leading whitespace from icon entries (keep 4-space indent)
            for entry in icon_entries:
                stripped = entry.strip()
                if stripped:
                    out.append("    " + stripped)
                else:
                    out.append("")
            out.append("  };")
            # Proxy lines: skip the closing `})());` line because we add it last
            for pl in proxy_lines[:-1]:
                out.append(pl)
            # Last line is `})());` 
            out.append(proxy_lines[-1])

            i = k + 1
            fixed = True
            continue
        out.append(line)
        i += 1

    if fixed:
        new_src = '\n'.join(out)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_src)
        print(f"FIXED (manual): {path}")
        return True
    return False


def manual_fix_v2(path: str) -> bool:
    """Fixes the simpler variant where the inner body is `return new Proxy({}, ...)`.
    
    Pattern:
        jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
          const __orig = {
          const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
          return new Proxy({}, { get: () => Icon });
        };
          return new Proxy(__orig, { ... });
        })());
    
    Replacement: drop the `const __orig = {`, drop the inner `return new Proxy({}, ...)`,
    drop the inner `};`, and define `__orig = {}` so outer proxy works.
    """
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()

    if 'const __orig = {' not in src:
        return False

    lines = src.split('\n')
    out = []
    i = 0
    fixed = False
    while i < len(lines):
        line = lines[i]
        if (
            "jest.mock('lucide-react'" in line
            and i + 4 < len(lines)
            and lines[i + 1].strip() == "const __orig = {"
            and lines[i + 2].strip().startswith("const Icon")
            and lines[i + 3].strip().startswith("return new Proxy({}")
            and lines[i + 4].strip() == "};"
        ):
            # Find end: `})());`
            k = i + 5
            proxy_lines = []
            while k < len(lines):
                proxy_lines.append(lines[k])
                stripped = lines[k].rstrip()
                if stripped.endswith("})());") or stripped.endswith("})())"):
                    break
                k += 1
            if k >= len(lines):
                out.append(line)
                i += 1
                continue
            # Reconstruct
            out.append("jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */")
            out.append("  const Icon = ({ className }: { className?: string }) => {")
            out.append("    const React = require('react');")
            out.append("    return React.createElement('span', { className }, 'icon');")
            out.append("  };")
            out.append("  const __orig: Record<string, any> = {};")
            for pl in proxy_lines:
                out.append(pl)
            i = k + 1
            fixed = True
            continue
        # Variant for pages-smoke / app-pages-coverage with multi-line MockIcon body
        if (
            "jest.mock('lucide-react'" in line
            and i + 1 < len(lines)
            and lines[i + 1].strip() == "const __orig = {"
        ):
            # Find the closing `};` that matches the corrupt block
            # then `return new Proxy(__orig, ...)` after it
            j = i + 2
            inner_lines = []
            while j < len(lines):
                if lines[j].strip() == "};" and j + 1 < len(lines) and lines[j + 1].strip().startswith("return new Proxy(__orig"):
                    break
                inner_lines.append(lines[j])
                j += 1
            if j >= len(lines):
                out.append(line)
                i += 1
                continue
            # j points at the inner `};`
            k = j + 1
            proxy_lines = []
            while k < len(lines):
                proxy_lines.append(lines[k])
                stripped = lines[k].rstrip()
                if stripped.endswith("})());") or stripped.endswith("})())"):
                    break
                k += 1
            if k >= len(lines):
                out.append(line)
                i += 1
                continue
            # Reconstruct
            out.append("jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */")
            out.append("  const Icon = ({ className }: { className?: string }) => {")
            out.append("    const React = require('react');")
            out.append("    return React.createElement('span', { className }, 'icon');")
            out.append("  };")
            out.append("  const __orig: Record<string, any> = {};")
            for pl in proxy_lines:
                out.append(pl)
            i = k + 1
            fixed = True
            continue
        out.append(line)
        i += 1

    if fixed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(out))
        print(f"FIXED (v2): {path}")
        return True
    return False


def main():
    # Find all candidate files
    candidates = []
    for root, dirs, files in os.walk(os.path.join(ROOT, '__tests__')):
        for f in files:
            if f.endswith(('.test.ts', '.test.tsx')):
                p = os.path.join(root, f)
                with open(p, 'r', encoding='utf-8', errors='ignore') as fh:
                    if 'const __orig = {' in fh.read():
                        candidates.append(p)

    print(f"Found {len(candidates)} candidate files")

    fixed_count = 0
    for c in candidates:
        if fix_file(c):
            fixed_count += 1
        elif manual_fix_v2(c):
            fixed_count += 1

    print(f"\nFixed {fixed_count}/{len(candidates)} files")


if __name__ == '__main__':
    main()
