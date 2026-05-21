#!/usr/bin/env python3
"""
Upgrades weak `<HookName>: jest.fn()` stubs inside `jest.mock('wagmi', ...)`
factories to a stronger default that returns a sane shape, so destructured
calls like `const { switchChainAsync } = useSwitchChain()` don't crash.

Idempotent and SAFE:
  *  Only replaces the EXACT no-arg pattern `KeyName: jest.fn()`.
  *  Leaves intentional `jest.fn(() => ...)` overrides alone.
  *  Only touches text inside `jest.mock('wagmi', ...)` factories.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

HOOK_DEFAULTS: dict[str, str] = {
    "useAccount":                "jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' }))",
    "useChainId":                "jest.fn(() => 1)",
    "useConfig":                 "jest.fn(() => ({}))",
    "useConnect":                "jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' }))",
    "useConnections":            "jest.fn(() => [])",
    "useDisconnect":             "jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() }))",
    "useSwitchChain":            "jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' }))",
    "useReadContract":           "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))",
    "useReadContracts":          "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))",
    "useBalance":                "jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }))",
    "useBlockNumber":            "jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() }))",
    "useEnsName":                "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useEnsAvatar":              "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useEstimateGas":            "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useWriteContract":          "jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() }))",
    "useSendTransaction":        "jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null }))",
    "useWaitForTransactionReceipt": "jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false }))",
    "useWatchContractEvent":     "jest.fn(() => undefined)",
    "useSignTypedData":          "jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))",
    "useSignMessage":            "jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))",
    "usePublicClient":           "jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() }))",
    "useWalletClient":           "jest.fn(() => ({ data: undefined, isLoading: false }))",
}

JEST_MOCK_WAGMI_RE = re.compile(
    r"""(?P<head>jest\.mock\(\s*['"]wagmi['"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{)
        (?P<body>.*?)
        (?P<tail>\}\s*\)\s*\)\s*;?)""",
    re.DOTALL | re.VERBOSE,
)


def upgrade_body(body: str) -> tuple[str, int]:
    n = 0
    new_body = body
    for hook, strong in HOOK_DEFAULTS.items():
        weak_re = re.compile(
            r"\b" + re.escape(hook) + r"\s*:\s*jest\.fn\(\s*\)(\s*as\s+[^,\n}]+)?",
        )

        def repl(_m: re.Match[str]) -> str:
            nonlocal n
            n += 1
            return f"{hook}: {strong}"

        new_body = weak_re.sub(repl, new_body)
    return new_body, n


def patch_text(src: str) -> tuple[str, int]:
    total = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal total
        head = match.group("head")
        body = match.group("body")
        tail = match.group("tail")
        new_body, n = upgrade_body(body)
        total += n
        return f"{head}{new_body}{tail}"

    new_src = JEST_MOCK_WAGMI_RE.sub(replace, src)
    return new_src, total


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
        if "jest.mock" not in src or ("'wagmi'" not in src and '"wagmi"' not in src):
            continue
        new_src, n = patch_text(src)
        if n > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total += n
    print(f"{patched} files upgraded, {total} stubs strengthened")
    return 0


if __name__ == "__main__":
    sys.exit(main())
