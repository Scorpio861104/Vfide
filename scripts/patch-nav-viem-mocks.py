#!/usr/bin/env python3
"""
Augments `jest.mock('next/navigation', () => ({...}))` factories with the
full set of navigation helpers tests' code paths reach for. Adds:

  *  redirect, permanentRedirect, notFound  (server-side navigation)
  *  useRouter, usePathname, useSearchParams, useParams, useSelectedLayoutSegment
  *  useSelectedLayoutSegments

Idempotent — only adds keys that don't already exist.

Also patches `jest.mock('viem', () => ({...}))` factories with extra
helpers commonly used by hooks: parseAbi, parseAbiItem, formatUnits,
parseUnits, getAddress, isAddress, encodeFunctionData,
decodeFunctionResult, keccak256, toBytes, encodeAbiParameters,
decodeAbiParameters, zeroAddress, padHex, toHex, hexToString.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

NAV_DEFAULTS: dict[str, str] = {
    "redirect":                  "jest.fn(() => { throw new Error('NEXT_REDIRECT'); })",
    "permanentRedirect":         "jest.fn(() => { throw new Error('NEXT_REDIRECT'); })",
    "notFound":                  "jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); })",
    "useRouter":                 "jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn() }))",
    "usePathname":               "jest.fn(() => '/')",
    "useSearchParams":           "jest.fn(() => new URLSearchParams())",
    "useParams":                 "jest.fn(() => ({}))",
    "useSelectedLayoutSegment":  "jest.fn(() => null)",
    "useSelectedLayoutSegments": "jest.fn(() => [])",
}

VIEM_DEFAULTS: dict[str, str] = {
    "parseAbi":             "jest.fn(() => [])",
    "parseAbiItem":         "jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' }))",
    "formatUnits":          "jest.fn((v: any) => String(v))",
    "parseUnits":           "jest.fn((v: any) => BigInt(v || 0))",
    "formatEther":          "jest.fn((v: any) => String(v))",
    "parseEther":           "jest.fn((v: any) => BigInt(v || 0))",
    "getAddress":           "jest.fn((a: string) => a)",
    "isAddress":            "jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a))",
    "encodeFunctionData":   "jest.fn(() => '0x')",
    "decodeFunctionResult": "jest.fn(() => undefined)",
    "encodeAbiParameters":  "jest.fn(() => '0x')",
    "decodeAbiParameters":  "jest.fn(() => [])",
    "keccak256":            "jest.fn(() => '0x' + '0'.repeat(64))",
    "toBytes":              "jest.fn(() => new Uint8Array())",
    "toHex":                "jest.fn((v: any) => '0x' + (v ?? '').toString(16))",
    "hexToString":          "jest.fn((h: any) => String(h))",
    "padHex":               "jest.fn((h: any) => h)",
    "zeroAddress":          "'0x0000000000000000000000000000000000000000'",
    "stringToHex":          "jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex'))",
    "createPublicClient":   "jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() }))",
    "createWalletClient":   "jest.fn(() => ({ writeContract: jest.fn() }))",
    "http":                 "jest.fn(() => ({}))",
    "custom":               "jest.fn(() => ({}))",
    "erc20Abi":             "[]",
    "erc721Abi":            "[]",
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
        if "next/navigation" in src:
            new_src, n = patch_text(new_src, "next/navigation", NAV_DEFAULTS)
            n_total += n
        if "'viem'" in src or '"viem"' in src:
            new_src, n = patch_text(new_src, "viem", VIEM_DEFAULTS)
            n_total += n
        if n_total > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total += n_total
    print(f"{patched} files patched, {total} navigation/viem stubs added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
