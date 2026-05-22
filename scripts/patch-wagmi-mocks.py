#!/usr/bin/env python3
"""
Patches **/*.{ts,tsx} so every `jest.mock('wagmi', () => ({ ... }))` factory
exports the full set of commonly-used wagmi hooks WITH SAFE DEFAULT RETURN
VALUES.

Uses a brace-balanced parser (NOT regex .*?) so it correctly handles
nested objects/arrow factories like `useSwitchChain: jest.fn(() => ({ ... }))`.

Idempotent: only adds keys that don't already exist.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import List

HOOK_DEFAULTS: dict[str, str] = {
    "useAccount":                "jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined }))",
    "useChainId":                "jest.fn(() => 1)",
    "useSwitchChain":            "jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle', isPending: false, isError: false, error: null, reset: jest.fn() }))",
    "useReadContract":           "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))",
    "useReadContracts":          "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))",
    "useWriteContract":          "jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() }))",
    "useWaitForTransactionReceipt": "jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false }))",
    "useWatchContractEvent":     "jest.fn(() => undefined)",
    "usePublicClient":           "jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() }))",
    "useWalletClient":           "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useSignTypedData":          "jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))",
    "useSignMessage":            "jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))",
    "useConnect":                "jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' }))",
    "useDisconnect":             "jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() }))",
    "useConnections":            "jest.fn(() => [])",
    "useBalance":                "jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }))",
    "useEnsName":                "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useEnsAvatar":              "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useBlockNumber":            "jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() }))",
    "useEstimateGas":            "jest.fn(() => ({ data: undefined, isLoading: false }))",
    "useSendTransaction":        "jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null }))",
    "useConfig":                 "jest.fn(() => ({}))",
    "WagmiProvider":             "({ children }) => children",
    "createConfig":              "jest.fn(() => ({}))",
    "http":                      "jest.fn(() => ({}))",
}

START_RE = re.compile(r"jest\.mock\(\s*['\"]wagmi['\"]\s*,\s*\(\s*\)\s*=>\s*\(\s*\{")


def find_object_end(text: str, start: int) -> int:
    """Return index of the '}' that closes the object literal whose opening '{'
    is just before `start` (so depth begins at 1)."""
    depth = 1
    i = start
    in_str = None
    in_template = 0
    in_line_comment = False
    in_block_comment = False
    while i < len(text):
        c = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if in_line_comment:
            if c == "\n":
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
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
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c == "'" or c == '"':
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


def patch_text(src: str) -> tuple[str, int]:
    inserts = 0
    out_parts: list[str] = []
    pos = 0
    while True:
        m = START_RE.search(src, pos)
        if not m:
            out_parts.append(src[pos:])
            break
        # We are right after the opening '{' of the factory's returned object
        obj_start = m.end()
        obj_end = find_object_end(src, obj_start)
        if obj_end < 0:
            # Bail out — append rest and stop
            out_parts.append(src[pos:])
            break
        body = src[obj_start:obj_end]
        # Top-level keys (depth 0 inside this body): use a separate scan that
        # only reports `name :` at depth 0. For a quick approximation we scan
        # body and track depth.
        existing: set[str] = set()
        depth = 0
        i = 0
        in_str = None
        in_template = 0
        in_line_comment = False
        in_block_comment = False
        in_paren = 0
        while i < len(body):
            c = body[i]
            nxt = body[i + 1] if i + 1 < len(body) else ""
            if in_line_comment:
                if c == "\n":
                    in_line_comment = False
                i += 1
                continue
            if in_block_comment:
                if c == "*" and nxt == "/":
                    in_block_comment = False
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
                    while i < len(body) and local > 0:
                        cc = body[i]
                        if cc == "{":
                            local += 1
                        elif cc == "}":
                            local -= 1
                        i += 1
                    continue
                i += 1
                continue
            if c == "/" and nxt == "/":
                in_line_comment = True
                i += 2
                continue
            if c == "/" and nxt == "*":
                in_block_comment = True
                i += 2
                continue
            if c == "'" or c == '"':
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
            elif c == ":" and depth == 0 and in_paren == 0:
                # Look backward for the identifier
                j = i - 1
                while j >= 0 and body[j].isspace():
                    j -= 1
                end = j + 1
                while j >= 0 and (body[j].isalnum() or body[j] == "_" or body[j] == "$"):
                    j -= 1
                key = body[j + 1:end]
                if key:
                    existing.add(key)
            i += 1

        missing = [(k, v) for k, v in HOOK_DEFAULTS.items() if k not in existing]
        if not missing:
            out_parts.append(src[pos:obj_end + 1])
            pos = obj_end + 1
            continue

        # Build additions (preserve trailing comma rule)
        body_stripped = body.rstrip()
        needs_comma = bool(body_stripped) and not body_stripped.endswith(",") and not body_stripped.endswith("{")
        sep = "," if needs_comma else ""
        additions = "\n  " + ",\n  ".join(f"{k}: {v}" for k, v in missing) + ","
        inserts += len(missing)
        new_body = body_stripped + sep + additions + "\n"
        out_parts.append(src[pos:obj_start])
        out_parts.append(new_body)
        # we deliberately keep src[obj_end] == '}' attached to next chunk
        pos = obj_end

    return "".join(out_parts), inserts


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
