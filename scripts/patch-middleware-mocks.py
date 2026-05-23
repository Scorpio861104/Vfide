#!/usr/bin/env python3
"""
Patches `jest.mock('@/lib/auth/middleware', () => ({...}))` factories so
they export the full middleware surface used by app/api routes:

  *  Auth helpers: requireAuth, requireOwnership, requireAdmin,
     verifyAuth, getRequestAuthToken, optionalAuth, isAdmin,
     verifyOnChainAdmin, checkOwnership.
  *  Higher-order wrappers: `withAuth` / `withOwnership` MUST return a
     callable handler — not just `jest.fn()` — because routes call them
     as `export const GET = withAuth(async (req, user) => {...})` at
     module-load time. We default them to pass-through wrappers that
     forward through to the inner handler with a stub `user` payload.

Idempotent — only adds keys not already present in the factory body.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

# Higher-order wrappers MUST return a function so that routes calling
# `withAuth(handler)` at module load get back a usable handler.
WRAPPER_DEFAULT = (
    "jest.fn((handler: any) => async (req: any, ctx?: any) => "
    "handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx))"
)

MIDDLEWARE_DEFAULTS: dict[str, str] = {
    # Pure auth helpers
    "requireAuth":         "jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } }))",
    "requireOwnership":    "jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } }))",
    "requireAdmin":        "jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } }))",
    "verifyAuth":          "jest.fn(async () => ({ ok: true, user: { sub: 'test' } }))",
    "getRequestAuthToken": "jest.fn(async () => null)",
    "optionalAuth":        "jest.fn(async () => null)",
    "isAdmin":             "jest.fn(() => false)",
    "verifyOnChainAdmin":  "jest.fn(async () => false)",
    "checkOwnership":      "jest.fn(() => true)",
    # Higher-order wrappers
    "withAuth":            WRAPPER_DEFAULT,
    "withOwnership":       WRAPPER_DEFAULT,
}

JEST_MOCK_MIDDLEWARE_RE = re.compile(
    r"""(?P<head>jest\.mock\(\s*['"]@/lib/auth/middleware['"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{)
        (?P<body>.*?)
        (?P<tail>\}\s*\)\s*\)\s*;?)""",
    re.DOTALL | re.VERBOSE,
)


def patch_text(src: str) -> tuple[str, int]:
    inserts = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal inserts
        head = match.group("head")
        body = match.group("body")
        tail = match.group("tail")

        existing = set(re.findall(r"\b(\w+)\s*:", body))

        missing = [(k, v) for k, v in MIDDLEWARE_DEFAULTS.items() if k not in existing]
        if not missing:
            return match.group(0)

        indent_match = re.search(r"\n(\s*)\w", body)
        indent = indent_match.group(1) if indent_match else "  "

        trimmed = body.rstrip()
        needs_comma = bool(trimmed) and not trimmed.endswith(",")
        sep = "," if needs_comma else ""

        additions = "\n" + "\n".join(f"{indent}{k}: {v}," for k, v in missing)
        inserts += len(missing)
        return f"{head}{trimmed}{sep}{additions}\n{tail}"

    new_src = JEST_MOCK_MIDDLEWARE_RE.sub(replace, src)
    return new_src, inserts


def find_test_files(root: Path) -> List[Path]:
    files: List[Path] = []
    for sub in [
        root / "__tests__",
        root / "hooks" / "__tests__",
        root / "app",
        root / "lib" / "__tests__",
        root / "test",
    ]:
        if not sub.exists():
            continue
        for ext in ("*.ts", "*.tsx"):
            files.extend(sub.rglob(ext))
    return files


def main() -> int:
    root = Path.cwd()
    files = find_test_files(root)
    total = 0
    patched = 0
    for f in files:
        try:
            src = f.read_text(encoding="utf-8")
        except Exception:
            continue
        if "jest.mock" not in src or "@/lib/auth/middleware" not in src:
            continue
        new_src, n = patch_text(src)
        if n > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total += n
    print(f"{patched} files patched, {total} middleware stubs added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
