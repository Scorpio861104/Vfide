#!/usr/bin/env python3
"""
Augment lucide-react jest.mock factories with a Proxy fallback so that
ANY missing icon resolves to a generic stub, while preserving the test's
existing custom testids for known icons.

Strategy: wrap the inner factory's returned object in a Proxy whose
get-handler first checks the original object, then falls back to a
generic icon component. This keeps the explicit `Loader2 -> loader-icon`
mappings in tests intact while also providing icons not listed.

Idempotent (skips files already containing 'LucideProxyFallback').
"""
import re
import sys
from pathlib import Path

START_RE = re.compile(r"jest\.mock\(\s*['\"]lucide-react['\"]\s*,\s*\(\)\s*=>\s*")
SENTINEL = "LucideProxyFallback"

WRAPPER_PREFIX = (
    "(() => { /* " + SENTINEL + " */\n"
    "  const __orig = "
)
WRAPPER_SUFFIX = (
    ";\n"
    "  return new Proxy(__orig, {\n"
    "    get: (t, prop) => {\n"
    "      if (prop in t) return (t as any)[prop];\n"
    "      if (prop === '__esModule') return true;\n"
    "      if (typeof prop === 'symbol') return undefined;\n"
    "      const name = String(prop);\n"
    "      const Icon = ({ className, ...rest }: any) => {\n"
    "        const React = require('react');\n"
    "        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });\n"
    "      };\n"
    "      Icon.displayName = `LucideMock(${name})`;\n"
    "      return Icon;\n"
    "    },\n"
    "  });\n"
    "})()"
)


def find_call_end(text: str, start: int) -> int:
    """Given index of '(' opening jest.mock(...), find index of matching ')'."""
    if text[start] != "(":
        return -1
    depth = 0
    i = start
    in_str = None
    in_template = 0
    in_line_comment = False
    in_block_comment = False
    while i < len(text):
        c = text[i]
        nxt = text[i+1] if i+1 < len(text) else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str is not None:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if in_template:
            if c == "\\":
                i += 2
                continue
            if c == "`":
                in_template -= 1
                i += 1
                continue
            if c == "$" and nxt == "{":
                i += 2
                local = 1
                while i < len(text) and local > 0:
                    cc = text[i]
                    if cc == "{":
                        local += 1
                    elif cc == "}":
                        local -= 1
                    i += 1
                continue
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c == "'" or c == '"':
            in_str = c
            i += 1
            continue
        if c == "`":
            in_template += 1
            i += 1
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_arrow_body_range(text: str, start: int) -> tuple[int, int]:
    """
    Given the position right after `() => `, return (body_start, body_end_inclusive).
    Body can be:
      - `( <expr> )`  → return inclusive of outer parens
      - `<expr>`      → expression — heuristic: scan until matching delimiter
      - `{ <stmts> }` → block expression — return inclusive of outer braces
    For our case we just need to know where the second-arg arrow expression ends so
    we can wrap it. We return (body_start, body_end_exclusive) where body_end_exclusive
    is the index right after the last char of the body, expecting that char to be
    the closing `)` of jest.mock.
    """
    # skip whitespace
    i = start
    while i < len(text) and text[i].isspace():
        i += 1
    if i >= len(text):
        return (-1, -1)
    body_start = i
    # The arrow body extends until the closing `)` of jest.mock(...). We can
    # find that by locating the matching `)` of the outer call. Caller already
    # knows it. So just return body_start; caller knows body_end.
    return (body_start, -1)


def patch_file(p: Path) -> bool:
    src = p.read_text()
    if SENTINEL in src:
        return False
    m = START_RE.search(src)
    if not m:
        return False
    # find the '(' at jest.mock(
    paren_open = src.find("(", m.start())
    if paren_open < 0:
        return False
    paren_close = find_call_end(src, paren_open)
    if paren_close < 0:
        return False
    # body of the second arg starts right after `() => `
    body_start, _ = find_arrow_body_range(src, m.end())
    if body_start < 0:
        return False
    body = src[body_start:paren_close]  # excludes the closing `)`
    body_stripped = body.rstrip()
    if not body_stripped:
        return False
    # Wrap body
    wrapped = WRAPPER_PREFIX + body_stripped + WRAPPER_SUFFIX
    new_src = src[:body_start] + wrapped + src[paren_close:]
    p.write_text(new_src)
    return True


def main():
    root = Path("__tests__")
    changed = 0
    for f in root.rglob("*.test.ts*"):
        try:
            if patch_file(f):
                changed += 1
                print(f"patched {f}")
        except Exception as e:
            print(f"ERROR {f}: {e}", file=sys.stderr)
    print(f"\n{changed} files patched")


if __name__ == "__main__":
    main()
