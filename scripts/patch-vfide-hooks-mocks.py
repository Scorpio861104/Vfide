#!/usr/bin/env python3
"""
Augment jest.mock('@/lib/vfide-hooks', () => ({...})) factories so they
include any hook that the underlying production module exports but the
test mock didn't list, AND give the inserted stubs sensible default
return shapes so destructuring in components doesn't crash.

Idempotent.
"""
import re
import sys
from pathlib import Path

# Default return shapes for each hook. Keys must match exports of
# lib/vfide-hooks.ts. The values are JS literal strings inserted as the
# return value of jest.fn(() => <value>).
HOOK_DEFAULTS = {
    # Vault
    "useUserVault": "{ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() }",
    "useVaultBalance": "{ balance: 0n, isLoading: false, refetch: jest.fn() }",
    "useVaultPayMerchant": "{ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    "useSelfPanic": "{ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    "useCanSelfPanic": "{ canSelfPanic: false, isLoading: false, refetch: jest.fn() }",
    "useGuardianCancelInheritance": "{ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false }",
    "useInheritanceStatus": "{ status: undefined, isLoading: false, refetch: jest.fn() }",
    "useQuarantineStatus": "{ status: undefined, isLoading: false, refetch: jest.fn() }",
    # ProofScore
    "useProofScore": "{ score: 0, isLoading: false, refetch: jest.fn() }",
    "useScoreBreakdown": "{ breakdown: undefined, isLoading: false, refetch: jest.fn() }",
    "useEndorse": "{ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    "useCustomerTrustScore": "{ score: 0, isLoading: false, refetch: jest.fn() }",
    # Merchant
    "useIsMerchant": "{ isMerchant: false, isLoading: false, refetch: jest.fn() }",
    "useRegisterMerchant": "{ registerMerchant: jest.fn(), registerMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined }",
    "useGetAutoConvert": "{ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true }",
    "useSetAutoConvert": "{ setAutoConvert: jest.fn(), setAutoConvertAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    "useSetPayoutAddress": "{ setPayoutAddress: jest.fn(), setPayoutAddressAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    "useSetMerchantPullPermit": "{ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false }",
    "useProcessPayment": "{ processPayment: jest.fn(), processPaymentAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined }",
    "usePayMerchant": "{ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    "useMerchantPaymentStatus": "{ status: undefined, isLoading: false, refetch: jest.fn() }",
    # Badge
    "useBadgeNFTs": "{ badges: [], isLoading: false, refetch: jest.fn() }",
    "useUserBadges": "{ badges: [], isLoading: false, refetch: jest.fn() }",
    "useCanMintBadge": "{ canMint: false, isLoading: false, refetch: jest.fn() }",
    "useMintBadge": "{ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }",
    # Utility / activity / system
    "useActivityFeed": "{ activities: [], isLoading: false, refetch: jest.fn() }",
    "useFeeCalculator": "{ fee: 0n, isLoading: false }",
    "useSystemStats": "{ stats: undefined, isLoading: false, refetch: jest.fn() }",
    # Escrow
    "useEscrow": "{ escrow: undefined, isLoading: false, refetch: jest.fn() }",
}

HOOKS = list(HOOK_DEFAULTS.keys())

MOCK_RE = re.compile(
    r"jest\.mock\(\s*['\"]@/lib/vfide-hooks['\"]\s*,\s*\(\)\s*=>\s*\(\s*\{",
    re.MULTILINE,
)


def find_object_end(text: str, start: int) -> int:
    depth = 1
    i = start
    while i < len(text) and depth > 0:
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        elif c in ("'", '"', "`"):
            quote = c
            i += 1
            while i < len(text) and text[i] != quote:
                if text[i] == "\\":
                    i += 2
                    continue
                i += 1
        i += 1
    return -1


def patch_file(p: Path) -> bool:
    src = p.read_text()
    m = MOCK_RE.search(src)
    if not m:
        return False
    obj_start = m.end()
    obj_end = find_object_end(src, obj_start)
    if obj_end < 0:
        return False
    obj_body = src[obj_start:obj_end]
    existing = set(re.findall(r"\b(\w+)\s*:", obj_body))
    existing |= set(re.findall(r"\b(\w+)\s*[,}]", obj_body))
    missing = [h for h in HOOKS if h not in existing]
    if not missing:
        return False
    parts = [f"{h}: jest.fn(() => ({HOOK_DEFAULTS[h]}))" for h in missing]
    additions = "\n  " + ",\n  ".join(parts) + ","
    body = obj_body
    body_stripped = body.rstrip()
    if body_stripped and not body_stripped.endswith(",") and not body_stripped.endswith("{"):
        body = body_stripped + "," + body[len(body_stripped):]
    new_src = src[:obj_start] + body + additions + "\n" + src[obj_end:]
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
