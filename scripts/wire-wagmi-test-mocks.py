#!/usr/bin/env python3
"""
Rewires `mockUseX` top-level jest.fn() declarations into the wagmi mock factory.

Pattern detected:
  const mockUseWriteContract = jest.fn()
  const mockUseWaitForTransactionReceipt = jest.fn()
  ...
  jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
    ...
    useWriteContract: jest.fn(() => ({ ... })),  <-- broken: not wired to mockUseWriteContract
    useWaitForTransactionReceipt: jest.fn(() => ({...})),
    ...
  }))

Replacement:
    useWriteContract: (...args) => mockUseWriteContract(...args),

Idempotent: skips keys already in `() => mockX()` form.
"""
from __future__ import annotations
import re
from pathlib import Path

# Map from wagmi hook name to the conventional mock variable name
HOOK_TO_MOCK = {
    "useAccount": "mockUseAccount",
    "useChainId": "mockUseChainId",
    "useSwitchChain": "mockUseSwitchChain",
    "useReadContract": "mockUseReadContract",
    "useReadContracts": "mockUseReadContracts",
    "useWriteContract": "mockUseWriteContract",
    "useWaitForTransactionReceipt": "mockUseWaitForTransactionReceipt",
    "useWatchContractEvent": "mockUseWatchContractEvent",
    "usePublicClient": "mockUsePublicClient",
    "useWalletClient": "mockUseWalletClient",
    "useSignTypedData": "mockUseSignTypedData",
    "useSignMessage": "mockUseSignMessage",
    "useConnect": "mockUseConnect",
    "useDisconnect": "mockUseDisconnect",
    "useBalance": "mockUseBalance",
    "useGasPrice": "mockUseGasPrice",
    "useEstimateGas": "mockUseEstimateGas",
    "useEstimateFeesPerGas": "mockUseEstimateFeesPerGas",
    "useBlockNumber": "mockUseBlockNumber",
    "useSendTransaction": "mockUseSendTransaction",
    "useTransaction": "mockUseTransaction",
    "useTransactionReceipt": "mockUseTransactionReceipt",
    "useReconnect": "mockUseReconnect",
    "useConnections": "mockUseConnections",
    "useEnsName": "mockUseEnsName",
    "useEnsAvatar": "mockUseEnsAvatar",
}

WAGMI_MOCK_RE = re.compile(r"jest\.mock\(\s*['\"]wagmi['\"]\s*,")


def find_call_end(text: str, paren_open: int) -> int:
    if text[paren_open] != "(":
        return -1
    depth = 0; i = paren_open
    in_str = None; in_template = 0; in_lc = False; in_bc = False
    while i < len(text):
        c = text[i]; nxt = text[i+1] if i+1 < len(text) else ""
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


def patch_file(p: Path) -> int:
    src = p.read_text()
    # Find which mockUseX vars are declared at top level
    declared = set()
    for m in re.finditer(r"const\s+(mockUse[A-Z][A-Za-z0-9_]*)\s*=\s*jest\.fn\(\)", src):
        declared.add(m.group(1))
    if not declared:
        return 0
    # Find the wagmi mock factory
    wm = WAGMI_MOCK_RE.search(src)
    if not wm:
        return 0
    paren_open = src.find("(", wm.start())
    if paren_open < 0:
        return 0
    paren_close = find_call_end(src, paren_open)
    if paren_close < 0:
        return 0
    factory_text = src[wm.start():paren_close+1]
    new_factory = factory_text
    rewires = 0
    for hook, mock_var in HOOK_TO_MOCK.items():
        if mock_var not in declared:
            continue
        # Already wired? skip.
        # Patterns that count as "wired":
        #   useFoo: () => mockUseFoo()
        #   useFoo: () => mockUseFoo(args)
        #   useFoo: (...) => mockUseFoo(...)
        wired_re = re.compile(
            rf"\b{re.escape(hook)}\s*:\s*\([^)]*\)\s*=>\s*{re.escape(mock_var)}\b"
        )
        if wired_re.search(new_factory):
            continue
        # Find `useFoo: <expr>,` and replace with the wired form.
        # Use brace-balanced search: find `useFoo: ` then capture until matching depth-0 `,` or `\n`.
        key_pat = re.compile(rf"(\b{re.escape(hook)}\s*:\s*)")
        m = key_pat.search(new_factory)
        if not m:
            continue
        # Walk from after the colon, capturing balanced expression
        i = m.end()
        depth = 0
        in_str = None; in_template = 0; in_lc = False; in_bc = False
        start = i
        while i < len(new_factory):
            c = new_factory[i]; nxt = new_factory[i+1] if i+1 < len(new_factory) else ""
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
            if c in "([{":
                depth += 1
            elif c in ")]}":
                if depth == 0:
                    # End of value
                    break
                depth -= 1
            elif depth == 0 and (c == "," or c == "\n"):
                break
            i += 1
        # Replace value with the wired form
        new_value = f"(...args) => {mock_var}(...args)"
        new_factory = new_factory[:m.end()] + new_value + new_factory[i:]
        rewires += 1
    if rewires == 0:
        return 0
    new_src = src[:wm.start()] + new_factory + src[paren_close+1:]
    p.write_text(new_src)
    return rewires


def main():
    files_changed = 0
    rewires_total = 0
    for f in Path("__tests__").rglob("*.test.ts*"):
        try:
            n = patch_file(f)
        except Exception as e:
            print(f"[err] {f}: {e}")
            continue
        if n:
            files_changed += 1
            rewires_total += n
            print(f"[wire] {f}: +{n}")
    print(f"\n{files_changed} files patched; {rewires_total} hook→mock wirings added")


if __name__ == "__main__":
    main()
