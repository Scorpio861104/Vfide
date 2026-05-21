#!/usr/bin/env python3
"""
Patches **/*.{ts,tsx} so every `jest.mock('wagmi', () => ({ ... }))` factory
exports the full set of commonly-used wagmi hooks WITH SAFE DEFAULT RETURN
VALUES. This eliminates two error families:

  *  `(0 , _wagmi.useChainId) is not a function`            (missing key)
  *  `Cannot destructure property 'switchChainAsync' of
      '(0 , _wagmi.useSwitchChain)(...)' as it is undefined.` (key returns
      undefined when called as a hook)

Hook stubs default to `jest.fn(() => ({}))` for hooks whose consumers
typically destructure the return value, so destructuring yields
`undefined` for unknown keys instead of throwing on `undefined.foo`.

Idempotent: only adds keys that don't already exist; if a key exists with
ANY value (e.g. `useChainId: jest.fn()`), it's left alone — tests that
explicitly want to override the return value continue to work.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

# Hooks whose default return value is destructured by callers. These need
# to return an empty object so missing-key destructures yield undefined
# instead of throwing.
HOOK_DEFAULTS: dict[str, str] = {
    # Account / connection
    "useAccount":                "jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' }))",
    "useChainId":                "jest.fn(() => 1)",
    "useConfig":                 "jest.fn(() => ({}))",
    "useConnect":                "jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' }))",
    "useConnections":            "jest.fn(() => [])",
    "useDisconnect":             "jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() }))",
    "useSwitchChain":            "jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' }))",
    # Reads
    "useReadContract":           "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))",
    "useReadContracts":          "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))",
    "useBalance":                "jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }))",
    "useBlockNumber":            "jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() }))",
    "useEnsName":                "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useEnsAvatar":              "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useEstimateGas":            "jest.fn(() => ({ data: undefined, isLoading: false }))",
    # Writes
    "useWriteContract":          "jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() }))",
    "useSendTransaction":        "jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null }))",
    "useWaitForTransactionReceipt": "jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false }))",
    "useWatchContractEvent":     "jest.fn(() => undefined)",
    # Signing
    "useSignTypedData":          "jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))",
    "useSignMessage":            "jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))",
    # Clients
    "usePublicClient":           "jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() }))",
    "useWalletClient":           "jest.fn(() => ({ data: undefined, isLoading: false }))",
    # Misc
    "WagmiProvider":             "({ children }) => children",
    "createConfig":              "jest.fn(() => ({}))",
    "http":                      "jest.fn(() => ({}))",
}

# Match `jest.mock('wagmi', () => ({` ... `}))` allowing single or double quotes.
JEST_MOCK_WAGMI_RE = re.compile(
    r"""(?P<head>jest\.mock\(\s*['"]wagmi['"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{)
        (?P<body>.*?)
        (?P<tail>\}\s*\)\s*\)\s*;?)""",
    re.DOTALL | re.VERBOSE,
)


def patch_text(src: str) -> tuple[str, int]:
    inserts = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal inserts
        head = match.group("head")
        body = match.group("body")
        tail = match.group("tail")

        existing = set(re.findall(r"\b(\w+)\s*:", body))

        missing = [(k, v) for k, v in HOOK_DEFAULTS.items() if k not in existing]
        if not missing:
            return match.group(0)

        indent_match = re.search(r"\n(\s*)\w", body)
        indent = indent_match.group(1) if indent_match else "  "

        trimmed = body.rstrip()
        needs_comma = bool(trimmed) and not trimmed.endswith(",")
        sep = "," if needs_comma else ""

        additions = "\n" + "\n".join(
            f"{indent}{k}: {v}," for k, v in missing
        )
        inserts += len(missing)
        return f"{head}{trimmed}{sep}{additions}\n{tail}"

    new_src = JEST_MOCK_WAGMI_RE.sub(replace, src)
    return new_src, inserts


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
    total_inserts = 0
    patched = 0
    for f in files:
        try:
            src = f.read_text(encoding="utf-8")
        except Exception:
            continue
        if "jest.mock" not in src:
            continue
        if "'wagmi'" not in src and '"wagmi"' not in src:
            continue
        new_src, n = patch_text(src)
        if n > 0 and new_src != src:
            f.write_text(new_src, encoding="utf-8")
            patched += 1
            total_inserts += n
    print(f"{patched} files patched, {total_inserts} hook stubs added")
    return 0


if __name__ == "__main__":
    sys.exit(main())
