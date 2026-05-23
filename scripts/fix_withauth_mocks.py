#!/usr/bin/env python3
"""Upgrade withAuth + withOwnership mocks across api test files.

Why: many tests do `requireAuth.mockReturnValue({ user: { address: mockX } })`
expecting that to flow into the handler, but the existing mocks for
`withAuth` always pass `0x000...000` regardless. This causes 403 mismatches
because routes compare authAddress to a query/body address.

Replace:
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) =>
    handler(req, { sub: 'test', address: '0x000...000' }, ctx))
with a smart wrapper that consults requireAuth and bubbles up Response objects.
Same for withOwnership: call extractor and use that as the user address.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_DIR = os.path.join(ROOT, "__tests__", "api")

WITH_AUTH_OLD = re.compile(
    r"withAuth:\s*jest\.fn\(\(handler:\s*any\)\s*=>\s*async\s*\(req:\s*any,\s*ctx\?:\s*any\)\s*=>\s*handler\(req,\s*\{\s*sub:\s*'test',\s*address:\s*'0x0000000000000000000000000000000000000000'\s*\},\s*ctx\)\),"
)

WITH_AUTH_NEW = """withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => {
    // V2: consult requireAuth so tests that set its return value flow through.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),"""

WITH_OWN_OLD = re.compile(
    r"withOwnership:\s*jest\.fn\(\(_extractor:\s*any,\s*handler:\s*any\)\s*=>\s*async\s*\(req:\s*any,\s*ctx\?:\s*any\)\s*=>\s*handler\(req,\s*\{\s*sub:\s*'test',\s*address:\s*'0x0000000000000000000000000000000000000000'\s*\},\s*ctx\)\),"
)

WITH_OWN_NEW = """withOwnership: jest.fn((extractor: any, handler: any) => async (req: any, ctx?: any) => {
    // V2: extract target address from request and use it as auth user, bubble up
    // requireAuth Response if set.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
      else {
        const target = await extractor(req, ctx);
        if (typeof target === 'string' && target) {
          const addr = target.toLowerCase();
          user = { sub: addr, address: addr };
        }
      }
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),"""

count_auth = 0
count_own = 0
files_touched = []
for root, _dirs, files in os.walk(API_DIR):
    for fn in files:
        if not (fn.endswith(".test.ts") or fn.endswith(".test.tsx")):
            continue
        p = os.path.join(root, fn)
        with open(p) as f:
            s = f.read()
        s2 = s
        n_auth = len(WITH_AUTH_OLD.findall(s2))
        if n_auth:
            s2 = WITH_AUTH_OLD.sub(WITH_AUTH_NEW, s2)
            count_auth += n_auth
        n_own = len(WITH_OWN_OLD.findall(s2))
        if n_own:
            s2 = WITH_OWN_OLD.sub(WITH_OWN_NEW, s2)
            count_own += n_own
        if s2 != s:
            with open(p, "w") as f:
                f.write(s2)
            files_touched.append((os.path.relpath(p, ROOT), n_auth, n_own))

print(f"Touched {len(files_touched)} files. withAuth replacements: {count_auth}, withOwnership replacements: {count_own}")
for p, na, no in files_touched[:30]:
    print(f"  {p}  withAuth={na} withOwnership={no}")
if len(files_touched) > 30:
    print(f"  ... and {len(files_touched) - 30} more")
