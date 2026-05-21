#!/usr/bin/env python3
"""
Repair corrupted jest.mock factories for @/lib/contracts and
@/lib/contracts/future-contracts (and relative-path equivalents) by
replacing the entire factory call with a clean canonical one.

Trigger: the factory body contains stray top-level keys at depth-1 inside
a nested arrow factory (e.g. `getFutureContractAddresses: jest.fn(() => ({`
followed by additional `useXxx:` keys inside that nested body).

This script is a one-shot REPAIR. Use it AFTER finding such corruption,
not as a routine patcher.
"""
import re
import sys
from pathlib import Path

SENTINELS = {
    "@/lib/contracts": "// CANONICAL_CONTRACTS_MOCK",
    "@/lib/contracts/future-contracts": "// CANONICAL_FUTURE_CONTRACTS_MOCK",
}

CANONICAL_CONTRACTS = """({
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({})),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
})"""

CANONICAL_FUTURE = """({
  getFutureContractAddress: jest.fn(() => '0x0000000000000000000000000000000000000000'),
  getFutureContractAddresses: jest.fn(() => ({})),
  isConfiguredFutureContract: jest.fn(() => false),
  isFutureFeaturesEnabled: jest.fn(() => true),
  isFutureContractDeployed: jest.fn(() => false),
})"""


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
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if in_lc:
            if c == "\n":
                in_lc = False
            i += 1
            continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False
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
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_lc = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_bc = True
            i += 2
            continue
        if c in "'\"":
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


def is_factory_corrupted(text: str, paren_open: int, paren_close: int) -> bool:
    """Heuristic: factory body has top-level keys nested inside another
    arrow factory's returned object — detected by encountering a `\\n  use`/`get`
    inside an open paren."""
    body = text[paren_open + 1:paren_close]
    depth = 0
    in_paren = 0
    in_str = None
    in_template = 0
    in_lc = False
    in_bc = False
    i = 0
    while i < len(body):
        c = body[i]
        nxt = body[i + 1] if i + 1 < len(body) else ""
        if in_lc:
            if c == "\n":
                in_lc = False
            i += 1
            continue
        if in_bc:
            if c == "*" and nxt == "/":
                in_bc = False
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
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_lc = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_bc = True
            i += 2
            continue
        if c in "'\"":
            in_str = c
            i += 1
            continue
        if c == "`":
            in_template += 1
            i += 1
            continue
        if c == "(":
            in_paren += 1
        elif c == ")":
            in_paren -= 1
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        # Detect line starting with `  <ident>:` while in_paren > 0 and depth > 1
        if c == "\n" and in_paren > 0 and depth > 1:
            j = i + 1
            while j < len(body) and body[j] in " \t":
                j += 1
            if j < len(body) and body[j].isalpha():
                k = j
                while k < len(body) and (body[k].isalnum() or body[k] in "_$"):
                    k += 1
                if k < len(body) and body[k] == ":":
                    return True
        i += 1
    return False


def repair_module(src: str, module_path: str, sentinel: str, canonical_inner: str) -> tuple[str, bool]:
    if sentinel in src:
        return src, False
    pat = re.compile(r"jest\.mock\(\s*['\"]" + re.escape(module_path) + r"['\"]\s*,")
    m = pat.search(src)
    if not m:
        return src, False
    paren_open = src.find("(", m.start())
    paren_close = find_call_end(src, paren_open)
    if paren_close < 0:
        return src, False
    if not is_factory_corrupted(src, paren_open, paren_close):
        return src, False
    new_call = f"jest.mock('{module_path}', () => {canonical_inner})"
    new_src = src[:m.start()] + new_call + src[paren_close + 1:]
    return new_src, True


def main():
    targets = [
        ("@/lib/contracts", SENTINELS["@/lib/contracts"], CANONICAL_CONTRACTS),
        ("@/lib/contracts/future-contracts", SENTINELS["@/lib/contracts/future-contracts"], CANONICAL_FUTURE),
        ("../lib/contracts", SENTINELS["@/lib/contracts"], CANONICAL_CONTRACTS),
        ("../../lib/contracts", SENTINELS["@/lib/contracts"], CANONICAL_CONTRACTS),
        ("../lib/contracts/future-contracts", SENTINELS["@/lib/contracts/future-contracts"], CANONICAL_FUTURE),
        ("../../lib/contracts/future-contracts", SENTINELS["@/lib/contracts/future-contracts"], CANONICAL_FUTURE),
    ]
    fixed = 0
    for f in Path("__tests__").rglob("*.test.ts*"):
        try:
            src = f.read_text()
        except Exception:
            continue
        new = src
        any_fix = False
        for module_path, sentinel, canon in targets:
            new, did = repair_module(new, module_path, sentinel, canon)
            if did:
                any_fix = True
        if any_fix:
            f.write_text(new)
            fixed += 1
    print(f"{fixed} files repaired")


if __name__ == "__main__":
    main()
