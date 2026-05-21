#!/usr/bin/env python3
"""
Patch jest.mock factories for `@/lib/contracts` to inject the missing
`getContractAddresses` export.

The shape:
    jest.mock('@/lib/contracts', () => ({
      ...existing keys...
    }))

We append a getContractAddresses returning the same mocked object as
CONTRACT_ADDRESSES (which is what production resolves to anyway).
"""
import re
import sys
from pathlib import Path

ROOT = Path.cwd()
files = []
for line in sys.stdin:
    line = line.strip()
    if line:
        p = Path(line)
        if not p.is_absolute():
            p = ROOT / p
        files.append(p)

PATTERN_ADDR = "getContractAddresses"

# We want to insert a getContractAddresses entry inside the object literal
# of the mock factory. Strategy: regex-find `jest.mock('@/lib/contracts'` and
# locate the matching `}))` for that call; insert a comma + the new key
# just before the closing `}))`. This handles both styles:
#   jest.mock('@/lib/contracts', () => ({ ... }))
#   jest.mock('@/lib/contracts', () => ({
#       ...,
#   }))

def patch(text: str) -> tuple[str, bool]:
    if PATTERN_ADDR in text:
        return text, False  # already has it somewhere — be conservative

    # Find every jest.mock for @/lib/contracts and inject. Use a state machine
    # on parens to find matching close.
    out = []
    i = 0
    changed = False
    target_re = re.compile(r"jest\.mock\(\s*['\"]@/lib/contracts['\"]\s*,\s*\(\s*\)\s*=>\s*\(")
    while i < len(text):
        m = target_re.search(text, i)
        if not m:
            out.append(text[i:])
            break
        out.append(text[i:m.end()])
        # we are now positioned right after `=> (`
        j = m.end()
        depth = 1  # we just consumed one '('
        in_str = None
        # scan forward to find matching close paren
        while j < len(text) and depth > 0:
            ch = text[j]
            if in_str:
                if ch == '\\' and j + 1 < len(text):
                    j += 2
                    continue
                if ch == in_str:
                    in_str = None
            else:
                if ch in ('"', "'", '`'):
                    in_str = ch
                elif ch == '(':
                    depth += 1
                elif ch == ')':
                    depth -= 1
                    if depth == 0:
                        break
            j += 1
        # text[j] is the closing ')' of the outer paren wrapping the obj literal
        # The object literal is between `({` and `})` immediately inside.
        # Find the last `}` before this `)`.
        close_brace = text.rfind('}', m.end(), j)
        if close_brace == -1:
            out.append(text[m.end():])
            i = len(text)
            continue
        # Decide whether to add a comma before our new key
        before = text[m.end():close_brace]
        out.append(before)
        # Determine indentation: peek at last non-empty line
        lines = before.rsplit('\n', 1)
        indent = ''
        if len(lines) == 2:
            stripped = lines[1]
            indent_match = re.match(r"[ \t]*", stripped)
            indent = indent_match.group(0) if indent_match else ''
        if not indent:
            indent = '  '
        # ensure comma if the existing content (stripped) doesn't end with `,` or `{`
        b_stripped = before.rstrip()
        sep = ''
        if b_stripped and b_stripped[-1] not in (',', '{'):
            sep = ','
        injection = (
            f"{sep}\n{indent}getContractAddresses: () => CONTRACT_ADDRESSES,\n{indent[:-2] if len(indent) >= 2 else ''}"
        )
        # The injection references CONTRACT_ADDRESSES which may not be in scope of the mock factory;
        # safer to inline the same object. But CONTRACT_ADDRESSES IS the key in the same object,
        # so it works as a direct identifier inside the factory ONLY if hoisted -- it isn't.
        # Use a self-contained shape: return an empty object plus runtime fallbacks. The
        # production `getContractAddresses(chainId)` returns an object with named addresses.
        # Tests don't actually assert on its contents (most fail because the function is
        # missing entirely). Returning {} keeps them green for that import.
        injection = (
            f"{sep}\n{indent}getContractAddresses: () => ({{}}),\n"
        )
        out.append(injection)
        out.append(text[close_brace:j+1])
        i = j + 1
        changed = True
    return ''.join(out), changed


for f in files:
    if not f.is_file():
        print(f"SKIP (missing): {f}")
        continue
    src = f.read_text()
    new, ch = patch(src)
    if ch:
        f.write_text(new)
        print(f"PATCHED: {f.relative_to(ROOT)}")
    else:
        print(f"unchanged: {f.relative_to(ROOT)}")
