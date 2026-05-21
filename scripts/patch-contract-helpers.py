#!/usr/bin/env python3
"""
Augments `jest.mock('@/lib/contracts', () => ({ ... }))`,
`jest.mock('@/lib/contracts/future-contracts', ...)`,
and relative-path equivalents with helper exports the production
modules ship, so route/hook code that imports them at load time
doesn't blow up.

Uses brace-balanced parsing (NOT regex .*?) so it correctly handles
nested arrow factories (e.g. `getFutureContractAddresses: jest.fn(() => ({...}))`).

Idempotent: only adds top-level keys that don't already exist.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

DEFAULTS_CONTRACTS: dict[str, str] = {
    "getContractAddresses":         "jest.fn(() => ({}))",
    "isConfiguredContractAddress":  "jest.fn(() => true)",
    "validateContractAddress":      "jest.fn((addr: any) => addr)",
}

DEFAULTS_FUTURE: dict[str, str] = {
    "getFutureContractAddress":     "jest.fn(() => '0x0000000000000000000000000000000000000000')",
    "getFutureContractAddresses":   "jest.fn(() => ({}))",
    "isConfiguredFutureContract":   "jest.fn(() => false)",
    "isFutureFeaturesEnabled":      "jest.fn(() => true)",
    "isFutureContractDeployed":     "jest.fn(() => false)",
}

CONTRACTS_PATHS = [
    "@/lib/contracts",
    "../lib/contracts",
    "../../lib/contracts",
    "../../../lib/contracts",
]
FUTURE_PATHS = [
    "@/lib/contracts/future-contracts",
    "../lib/contracts/future-contracts",
    "../../lib/contracts/future-contracts",
    "../../../lib/contracts/future-contracts",
]


def find_object_end(text: str, start: int) -> int:
    """Return index of '}' that closes the object literal whose opening '{'
    is just before `start` (depth begins at 1)."""
    depth = 1
    i = start
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
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def top_level_keys(body: str) -> set[str]:
    """Return set of top-level (depth-0) `name:` keys in object body."""
    keys: set[str] = set()
    depth = 0
    in_paren = 0
    in_bracket = 0
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
        elif c == "[":
            in_bracket += 1
        elif c == "]":
            in_bracket -= 1
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == ":" and depth == 0 and in_paren == 0 and in_bracket == 0:
            j = i - 1
            while j >= 0 and body[j].isspace():
                j -= 1
            end = j + 1
            while j >= 0 and (body[j].isalnum() or body[j] == "_" or body[j] == "$"):
                j -= 1
            key = body[j + 1:end]
            if key:
                keys.add(key)
        i += 1
    return keys


def patch_for_module(src: str, module_path: str, defaults: dict[str, str]) -> tuple[str, int]:
    pat = re.compile(
        r"jest\.mock\(\s*['\"]" + re.escape(module_path) + r"['\"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{"
    )
    inserts = 0
    out: list[str] = []
    pos = 0
    while True:
        m = pat.search(src, pos)
        if not m:
            out.append(src[pos:])
            break
        obj_start = m.end()
        obj_end = find_object_end(src, obj_start)
        if obj_end < 0:
            out.append(src[pos:])
            break
        body = src[obj_start:obj_end]
        existing = top_level_keys(body)
        missing = [(k, v) for k, v in defaults.items() if k not in existing]
        out.append(src[pos:obj_start])
        if missing:
            body_stripped = body.rstrip()
            sep = "," if body_stripped and not body_stripped.endswith(",") and not body_stripped.endswith("{") else ""
            additions = "\n  " + ",\n  ".join(f"{k}: {v}" for k, v in missing) + ","
            out.append(body_stripped + sep + additions + "\n")
            inserts += len(missing)
        else:
            out.append(body)
        pos = obj_end
    return "".join(out), inserts


def find_test_files(root: Path) -> List[Path]:
    files: List[Path] = []
    for sub in [
        root / "__tests__",
        root / "hooks" / "__tests__",
        root / "components",
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
        if "jest.mock" not in src:
            continue
        n_total = 0
        new_src = src
        for module_path in CONTRACTS_PATHS:
            if module_path in src:
                new_src, n = patch_for_module(new_src, module_path, DEFAULTS_CONTRACTS)
                n_total += n
        for module_path in FUTURE_PATHS:
            if module_path in src:
                new_src, n = patch_for_module(new_src, module_path, DEFAULTS_FUTURE)
                n_total += n
        if n_total > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total += n_total
    print(f"{patched} files patched, {total} stubs added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
