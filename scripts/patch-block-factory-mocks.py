#!/usr/bin/env python3
"""
Patches `jest.mock('<module>', () => { ... return { ... }; })` block-style
factories. Sister script to patch-contract-helpers / patch-middleware-mocks
which only handle the arrow-style `() => ({ ... })` form. Many existing
test files use the block form, which the simpler regex-based patchers
cannot reach.

Strategy: brace-balanced parser to find the inner `return { ... }` object
literal, then inject missing keys before the closing brace.

Idempotent — only adds keys not already present.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

DEFAULTS_CONTRACTS: dict[str, str] = {
    "getContractAddresses":         "() => ({})",
    "isConfiguredContractAddress":  "(addr) => typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42 && addr !== '0x0000000000000000000000000000000000000000'",
    "validateContractAddress":      "(addr) => addr",
}

DEFAULTS_FUTURE: dict[str, str] = {
    "getFutureContractAddress":     "() => '0x0000000000000000000000000000000000000000'",
    "getFutureContractAddresses":   "() => ({})",
    "isConfiguredFutureContract":   "() => false",
}

DEFAULTS_MIDDLEWARE: dict[str, str] = {
    "requireAuth":         "async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })",
    "requireOwnership":    "async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })",
    "requireAdmin":        "async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })",
    "verifyAuth":          "async () => ({ ok: true, user: { sub: 'test' } })",
    "getRequestAuthToken": "async () => null",
    "optionalAuth":        "async () => null",
    "isAdmin":             "() => false",
    "verifyOnChainAdmin":  "async () => false",
    "checkOwnership":      "() => true",
    "withAuth":            "(handler) => async (req, ctx) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)",
    "withOwnership":       "(handler) => async (req, ctx) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)",
}


def find_matching_brace(src: str, open_idx: int) -> int | None:
    depth = 1
    j = open_idx + 1
    in_str: str | None = None
    in_line_comment = False
    in_block_comment = False
    while j < len(src):
        ch = src[j]
        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            j += 1
            continue
        if in_block_comment:
            if ch == "*" and j + 1 < len(src) and src[j + 1] == "/":
                in_block_comment = False
                j += 2
                continue
            j += 1
            continue
        if in_str:
            if ch == "\\" and j + 1 < len(src):
                j += 2
                continue
            if ch == in_str:
                in_str = None
            j += 1
            continue
        if ch in ("'", '"', "`"):
            in_str = ch
            j += 1
            continue
        if ch == "/" and j + 1 < len(src):
            nxt = src[j + 1]
            if nxt == "/":
                in_line_comment = True
                j += 2
                continue
            if nxt == "*":
                in_block_comment = True
                j += 2
                continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return j
        j += 1
    return None


def patch_block_factory(
    src: str, module_path: str, defaults: dict[str, str]
) -> tuple[str, int]:
    inserts = 0
    pattern = re.compile(
        r"jest\.mock\(\s*['\"]"
        + re.escape(module_path)
        + r"['\"]\s*,\s*\(\s*\)\s*=>\s*\{",
    )
    out: list[str] = []
    pos = 0
    while True:
        m = pattern.search(src, pos)
        if not m:
            out.append(src[pos:])
            break
        out.append(src[pos : m.end()])
        body_open_idx = m.end() - 1
        body_close_idx = find_matching_brace(src, body_open_idx)
        if body_close_idx is None:
            out.append(src[m.end():])
            break
        body = src[m.end():body_close_idx]
        ret_re = re.compile(r"\breturn\s*\{")
        ret_match = ret_re.search(body)
        if not ret_match:
            out.append(body)
            out.append("}")
            pos = body_close_idx + 1
            continue
        ret_obj_open = m.end() + ret_match.end() - 1
        ret_obj_close = find_matching_brace(src, ret_obj_open)
        if ret_obj_close is None:
            out.append(body)
            out.append("}")
            pos = body_close_idx + 1
            continue
        obj_text = src[ret_obj_open + 1 : ret_obj_close]
        # Detect both `key:` (regular) AND `key,` / `key }` (shorthand
        # property syntax: e.g. `return { requireAuth, withAuth }`).
        existing = set(re.findall(r"\b(\w+)\s*:", obj_text))
        existing |= set(re.findall(r"\b(\w+)\s*[,}]", obj_text))
        # Also exclude reserved JS words / control-flow tokens that could
        # match the shorthand pattern.
        existing -= {"return", "if", "else", "for", "while", "true", "false", "null"}
        missing = [(k, v) for k, v in defaults.items() if k not in existing]
        if not missing:
            out.append(src[m.end():body_close_idx + 1])
            pos = body_close_idx + 1
            continue
        indent_match = re.search(r"\n(\s*)\w", obj_text)
        indent = indent_match.group(1) if indent_match else "    "
        trimmed = obj_text.rstrip()
        needs_comma = bool(trimmed) and not trimmed.endswith(",") and not trimmed.endswith("{")
        sep = "," if needs_comma else ""
        additions = "\n" + "\n".join(
            f"{indent}{k}: {v}," for k, v in missing
        )
        out.append(src[m.end():ret_obj_open + 1])
        out.append(trimmed)
        out.append(sep)
        out.append(additions)
        out.append("\n" + (indent[:-2] if len(indent) >= 2 else "") + "}")
        out.append(src[ret_obj_close + 1 : body_close_idx + 1])
        inserts += len(missing)
        pos = body_close_idx + 1
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
        new_src = src
        n_total = 0
        for module_path in ("@/lib/contracts", "../lib/contracts", "../../lib/contracts", "../../../lib/contracts"):
            if module_path in src:
                new_src, n = patch_block_factory(new_src, module_path, DEFAULTS_CONTRACTS)
                n_total += n
        for module_path in ("@/lib/contracts/future-contracts", "../lib/contracts/future-contracts", "../../lib/contracts/future-contracts"):
            if module_path in src:
                new_src, n = patch_block_factory(new_src, module_path, DEFAULTS_FUTURE)
                n_total += n
        for module_path in ("@/lib/auth/middleware", "../lib/auth/middleware", "../../lib/auth/middleware"):
            if module_path in src:
                new_src, n = patch_block_factory(new_src, module_path, DEFAULTS_MIDDLEWARE)
                n_total += n
        if n_total > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total += n_total
    print(f"{patched} files patched (block-style), {total} stubs added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
