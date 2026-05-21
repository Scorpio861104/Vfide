#!/usr/bin/env python3
"""
Normalize ALL jest.mock factories for @/lib/contracts and @/lib/contracts/future-contracts
(and their relative-path variants) to a canonical, complete shape.

Idempotent via V2 sentinel. Overwrites V1 / partial mocks with the canonical V2
factory body, preserving any single-line balanced overrides for hand-tuned keys.
"""
from __future__ import annotations
import re
from pathlib import Path

SENTINELS = {
    "contracts": "// CANONICAL_CONTRACTS_MOCK_V4",
    "future":    "// CANONICAL_FUTURE_CONTRACTS_MOCK_V4",
}

CANONICAL_KEYS_CONTRACTS = [
    ("CONTRACT_ADDRESSES",          "{ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' }"),
    ("CONTRACTS",                   "{}"),
    ("getContractAddresses",        "jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' }))"),
    ("isConfiguredContractAddress", "jest.fn((addr) => typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr) && addr !== '0x0000000000000000000000000000000000000000')"),
    ("validateContractAddress",     "jest.fn((addr) => addr)"),
    ("ZERO_ADDRESS",                "'0x0000000000000000000000000000000000000000'"),
    ("CURRENT_CHAIN_ID",            "84532"),
]
CANONICAL_KEYS_FUTURE = [
    ("getFutureContractAddress",    "jest.fn(() => '0x2222222222222222222222222222222222222201')"),
    ("getFutureContractAddresses",  "jest.fn(() => ({ CardBoundVault: '0x2222222222222222222222222222222222222202', BadgeNFT: '0x2222222222222222222222222222222222222203', BadgeManager: '0x2222222222222222222222222222222222222204' }))"),
    ("isConfiguredFutureContract",  "jest.fn(() => true)"),
    ("isFutureFeaturesEnabled",     "jest.fn(() => true)"),
    ("isFutureContractDeployed",    "jest.fn(() => true)"),
    ("FUTURE_CONTRACT_ADDRESSES",   "{ CardBoundVault: '0x2222222222222222222222222222222222222202', BadgeNFT: '0x2222222222222222222222222222222222222203', BadgeManager: '0x2222222222222222222222222222222222222204' }"),
]

PRESERVE_CONTRACTS = {"CONTRACT_ADDRESSES", "CONTRACTS", "getContractAddresses", "isConfiguredContractAddress", "validateContractAddress"}
PRESERVE_FUTURE = {"getFutureContractAddress", "getFutureContractAddresses", "isConfiguredFutureContract", "isFutureFeaturesEnabled", "isFutureContractDeployed"}

# Values considered "trivially empty" — overwrite with canonical defaults:
EMPTY_VALUES = {
    "{}",
    "() => ({})",
    "jest.fn(() => ({}))",
    "jest.fn(() => null)",
    "jest.fn(() => undefined)",
    "jest.fn(() => false)",
    "jest.fn(() => '0x0000000000000000000000000000000000000000')",
}

MODULES = [
    ("@/lib/contracts",                        "contracts"),
    ("@/lib/contracts/future-contracts",       "future"),
    ("../lib/contracts",                       "contracts"),
    ("../../lib/contracts",                    "contracts"),
    ("../../../lib/contracts",                 "contracts"),
    ("../lib/contracts/future-contracts",      "future"),
    ("../../lib/contracts/future-contracts",   "future"),
    ("../../../lib/contracts/future-contracts","future"),
]


def find_call_end(text: str, paren_open: int) -> int:
    if text[paren_open] != "(":
        return -1
    depth = 0
    i = paren_open
    in_str = None
    in_template = 0
    in_lc = False
    in_bc = False
    while i < len(text):
        c = text[i]
        nxt = text[i+1] if i+1 < len(text) else ""
        if in_lc:
            if c == "\n": in_lc = False
            i += 1; continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False; i += 2; continue
            i += 1; continue
        if in_str is not None:
            if c == "\\":
                i += 2; continue
            if c == in_str: in_str = None
            i += 1; continue
        if in_template:
            if c == "\\":
                i += 2; continue
            if c == "`":
                in_template -= 1
            i += 1; continue
        if c == "/" and nxt == "/":
            in_lc = True; i += 2; continue
        if c == "/" and nxt == "*":
            in_bc = True; i += 2; continue
        if c in "\"'":
            in_str = c; i += 1; continue
        if c == "`":
            in_template += 1; i += 1; continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_object_end(text: str, brace_open: int) -> int:
    if text[brace_open] != "{":
        return -1
    depth = 0
    i = brace_open
    in_str = None
    in_template = 0
    in_lc = False
    in_bc = False
    while i < len(text):
        c = text[i]
        nxt = text[i+1] if i+1 < len(text) else ""
        if in_lc:
            if c == "\n": in_lc = False
            i += 1; continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False; i += 2; continue
            i += 1; continue
        if in_str is not None:
            if c == "\\":
                i += 2; continue
            if c == in_str: in_str = None
            i += 1; continue
        if in_template:
            if c == "\\":
                i += 2; continue
            if c == "`":
                in_template -= 1
            i += 1; continue
        if c == "/" and nxt == "/":
            in_lc = True; i += 2; continue
        if c == "/" and nxt == "*":
            in_bc = True; i += 2; continue
        if c in "\"'":
            in_str = c; i += 1; continue
        if c == "`":
            in_template += 1; i += 1; continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_factory_body(call_text: str) -> tuple[int, int] | None:
    arrow_idx = call_text.find("=>")
    if arrow_idx < 0:
        return None
    j = arrow_idx + 2
    while j < len(call_text) and call_text[j] in " \t\r\n":
        j += 1
    if j < len(call_text) and call_text[j] == "(":
        j += 1
        while j < len(call_text) and call_text[j] in " \t\r\n":
            j += 1
    if j >= len(call_text) or call_text[j] != "{":
        return None
    end = find_object_end(call_text, j)
    if end < 0:
        return None
    return (j, end)


def top_level_overrides(body: str) -> dict[str, str]:
    out: dict[str, str] = {}
    i = 0
    depth = 0
    in_str = None
    in_template = 0
    in_lc = False
    in_bc = False
    pending_key = None
    value_start = None
    while i < len(body):
        c = body[i]
        nxt = body[i+1] if i+1 < len(body) else ""
        if in_lc:
            if c == "\n": in_lc = False
            i += 1; continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False; i += 2; continue
            i += 1; continue
        if in_str is not None:
            if c == "\\":
                i += 2; continue
            if c == in_str: in_str = None
            i += 1; continue
        if in_template:
            if c == "\\":
                i += 2; continue
            if c == "`":
                in_template -= 1
            i += 1; continue
        if c == "/" and nxt == "/":
            in_lc = True; i += 2; continue
        if c == "/" and nxt == "*":
            in_bc = True; i += 2; continue
        if c in "\"'":
            in_str = c; i += 1; continue
        if c == "`":
            in_template += 1; i += 1; continue

        if depth == 0 and pending_key is None and (c.isalpha() or c == "_" or c == "$"):
            k = i
            while k < len(body) and (body[k].isalnum() or body[k] in "_$"):
                k += 1
            ws = k
            while ws < len(body) and body[ws] in " \t":
                ws += 1
            if ws < len(body) and body[ws] == ":":
                pending_key = body[i:k]
                i = ws + 1
                while i < len(body) and body[i] in " \t":
                    i += 1
                value_start = i
                continue
            else:
                i = k; continue

        if pending_key is not None:
            if c in "{[(":
                depth += 1
            elif c in "}])":
                if depth > 0:
                    depth -= 1
            if depth == 0 and (c == "," or c == "\n"):
                v = body[value_start:i].strip().rstrip(",").strip()
                if v and "\n" not in v and v.count("(") == v.count(")") and v.count("{") == v.count("}") and v.count("[") == v.count("]"):
                    out[pending_key] = v
                pending_key = None
                value_start = None
                i += 1; continue
        i += 1
    if pending_key is not None and value_start is not None:
        v = body[value_start:].strip().rstrip(",").strip()
        if v and "\n" not in v and v.count("(") == v.count(")") and v.count("{") == v.count("}") and v.count("[") == v.count("]"):
            out[pending_key] = v
    return out


def build_canonical(module_path: str, kind: str, preserved: dict[str, str]) -> str:
    sentinel = SENTINELS[kind]
    keys = CANONICAL_KEYS_CONTRACTS if kind == "contracts" else CANONICAL_KEYS_FUTURE
    preserve_set = PRESERVE_CONTRACTS if kind == "contracts" else PRESERVE_FUTURE
    lines = [f"jest.mock('{module_path}', () => ({{"]
    lines.append(f"  {sentinel}")
    used = set()
    for k, default in keys:
        v = preserved.get(k) if k in preserve_set else None
        # Reject trivially empty values — fall back to canonical default
        if v is not None and v.strip() in EMPTY_VALUES:
            v = None
        if not v:
            v = default
        lines.append(f"  {k}: {v},")
        used.add(k)
    for k, v in preserved.items():
        if k in used:
            continue
        lines.append(f"  {k}: {v},")
    lines.append("}))")
    return "\n".join(lines)


def patch_file(p: Path) -> int:
    src = p.read_text()
    changed = 0
    for module_path, kind in MODULES:
        sentinel = SENTINELS[kind]
        pat = re.compile(r"jest\.mock\(\s*['\"]" + re.escape(module_path) + r"['\"]\s*,")
        m = pat.search(src)
        if not m:
            continue
        paren_open = src.find("(", m.start())
        if paren_open < 0:
            continue
        paren_close = find_call_end(src, paren_open)
        if paren_close < 0:
            continue
        call_text = src[m.start():paren_close+1]
        if sentinel in call_text:
            continue
        body_range = extract_factory_body(call_text)
        preserved: dict[str, str] = {}
        if body_range:
            bs, be = body_range
            body = call_text[bs+1:be]
            preserved = top_level_overrides(body)
        new_call = build_canonical(module_path, kind, preserved)
        src = src[:m.start()] + new_call + src[paren_close+1:]
        changed += 1
    if changed:
        p.write_text(src)
    return changed


def main():
    fixed_files = 0
    fixed_mocks = 0
    roots = [Path("__tests__"), Path("mocks"), Path("components"), Path("hooks"), Path("lib")]
    for root in roots:
        if not root.exists():
            continue
        for f in root.rglob("*.test.ts*"):
            try:
                n = patch_file(f)
            except Exception as e:
                print(f"[err] {f}: {e}")
                continue
            if n:
                fixed_files += 1
                fixed_mocks += n
    print(f"{fixed_files} files normalized; {fixed_mocks} mock factories rewritten")


if __name__ == "__main__":
    main()
