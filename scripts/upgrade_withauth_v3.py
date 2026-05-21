#!/usr/bin/env python3
"""Upgrade V2 -> V3: change `m.requireAuth(req)` to await its Promise (if any)."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(ROOT, "__tests__", "api")

OLD_LINE = "const r = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;"
NEW_LINES = (
    "const r0 = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;\n"
    "      const r = (r0 && typeof (r0 as any).then === 'function') ? await r0 : r0;"
)

count = 0
files = []
for root, _ds, fns in os.walk(API_DIR):
    for fn in fns:
        if not (fn.endswith(".test.ts") or fn.endswith(".test.tsx")):
            continue
        p = os.path.join(root, fn)
        with open(p) as fh:
            s = fh.read()
        if OLD_LINE not in s:
            continue
        n = s.count(OLD_LINE)
        s2 = s.replace(OLD_LINE, NEW_LINES)
        s2 = s2.replace("// V2: consult requireAuth", "// V3: consult requireAuth (sync or async)")
        s2 = s2.replace("// V2: extract target address", "// V3: extract target address")
        with open(p, "w") as fh:
            fh.write(s2)
        files.append(p)
        count += n
print(f"Touched {len(files)} files; total replacements: {count}")
