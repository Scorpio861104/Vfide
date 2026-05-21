#!/usr/bin/env python3
"""
Augments `jest.mock('@/lib/contracts', () => ({ ... }))` factories with
the auxiliary helper exports the production module ships, so route /
hook code that imports them at module load doesn't blow up:

  *  getContractAddresses(chainId)  -> () => ({})
  *  isConfiguredContractAddress(a) -> () => true   (lenient)
  *  validateContractAddress(...)   -> identity     (lenient)

Also patches `jest.mock('@/lib/futurecontracts', ...)` factories with
`getFutureContractAddress`.

Idempotent — only adds keys that don't already exist.
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
}


def make_re(module_path: str) -> re.Pattern[str]:
    return re.compile(
        r"""(?P<head>jest\.mock\(\s*['"]"""
        + re.escape(module_path)
        + r"""['"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{)
            (?P<body>.*?)
            (?P<tail>\}\s*\)\s*\)\s*;?)""",
        re.DOTALL | re.VERBOSE,
    )


def patch_text(src: str, module_path: str, defaults: dict[str, str]) -> tuple[str, int]:
    pattern = make_re(module_path)
    inserts = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal inserts
        head = match.group("head")
        body = match.group("body")
        tail = match.group("tail")
        existing = set(re.findall(r"\b(\w+)\s*:", body))
        missing = [(k, v) for k, v in defaults.items() if k not in existing]
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

    return pattern.sub(replace, src), inserts


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
        if "@/lib/contracts" in src:
            new_src, n = patch_text(new_src, "@/lib/contracts", DEFAULTS_CONTRACTS)
            n_total += n
        if "@/lib/contracts/future-contracts" in src:
            new_src, n = patch_text(new_src, "@/lib/contracts/future-contracts", DEFAULTS_FUTURE)
            n_total += n
        if "@/lib/futurecontracts" in src:
            new_src, n = patch_text(new_src, "@/lib/futurecontracts", DEFAULTS_FUTURE)
            n_total += n
        if n_total > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total += n_total
    print(f"{patched} files patched, {total} contract-helper stubs added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
