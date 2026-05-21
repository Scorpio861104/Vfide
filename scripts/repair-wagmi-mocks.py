#!/usr/bin/env python3
"""
Repair corrupted jest.mock('wagmi', () => ({...})) factories by replacing
the ENTIRE factory call with a clean canonical one.

Preserves overrides for a small set of commonly customized hooks
(useAccount, useChainId, useSwitchChain) by attempting to scrape the
original `jest.fn(() => (<expr>))` literal from the corrupted body and
splicing it back in.

Idempotent: clean factories already containing CANONICAL_SENTINEL are skipped.
"""
import re
import sys
from pathlib import Path

CANONICAL_SENTINEL = "/* CANONICAL_WAGMI_MOCK_V2 */"

# Order-preserving canonical key/value pairs.
DEFAULTS: list[tuple[str, str]] = [
    ("useAccount",                "jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined }))"),
    ("useChainId",                "jest.fn(() => 1)"),
    ("useSwitchChain",            "jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle', isPending: false, isError: false, error: null, reset: jest.fn() }))"),
    ("useReadContract",           "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))"),
    ("useReadContracts",          "jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() }))"),
    ("useWriteContract",          "jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() }))"),
    ("useWaitForTransactionReceipt", "jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false }))"),
    ("useWatchContractEvent",     "jest.fn(() => undefined)"),
    ("usePublicClient",           "jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() }))"),
    ("useWalletClient",           "jest.fn(() => ({ data: undefined, isLoading: false }))"),
    ("useSignTypedData",          "jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))"),
    ("useSignMessage",            "jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() }))"),
    ("useConnect",                "jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' }))"),
    ("useDisconnect",             "jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() }))"),
    ("useConnections",            "jest.fn(() => [])"),
    ("useBalance",                "jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }))"),
    ("useEnsName",                "jest.fn(() => ({ data: undefined, isLoading: false }))"),
    ("useEnsAvatar",              "jest.fn(() => ({ data: undefined, isLoading: false }))"),
    ("useBlockNumber",            "jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() }))"),
    ("useEstimateGas",            "jest.fn(() => ({ data: undefined, isLoading: false }))"),
    ("useSendTransaction",        "jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null }))"),
    ("useConfig",                 "jest.fn(() => ({}))"),
    ("WagmiProvider",             "({ children }) => children"),
    ("createConfig",              "jest.fn(() => ({}))"),
    ("createStorage",             "jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }))"),
    ("cookieStorage",             "{ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() }"),
    ("http",                      "jest.fn(() => ({}))"),
    ("fallback",                  "jest.fn(() => ({}))"),
    ("useGasPrice",               "jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }))"),
    ("useEstimateFeesPerGas",     "jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }))"),
    ("useReconnect",              "jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false }))"),
    ("useTransaction",            "jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false }))"),
    ("useTransactionReceipt",     "jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false }))"),
    ("serialize",                 "jest.fn((v) => JSON.stringify(v))"),
    ("deserialize",               "jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } })"),
    ("cookieToInitialState",      "jest.fn(() => undefined)"),
]

PRESERVE_KEYS = {
    "useAccount", "useChainId", "useSwitchChain", "useReadContract", "useReadContracts",
    "useWriteContract", "useWaitForTransactionReceipt", "useBalance", "useGasPrice",
    "useEstimateGas", "useEstimateFeesPerGas", "useConnect", "useDisconnect",
    "usePublicClient", "useWalletClient", "useSignTypedData", "useSignMessage",
    "useSendTransaction", "useBlockNumber", "useTransaction", "useTransactionReceipt",
    "useEnsName", "useEnsAvatar", "useReconnect", "useConnections", "useWatchContractEvent",
}

START_RE = re.compile(r"jest\.mock\(\s*['\"]wagmi['\"]\s*,")


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
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_value_for_key(body: str, key: str) -> str | None:
    """Best-effort scrape of `key: <value>,` from body. Stops at first
    balanced top-level value end (comma at depth 0 OR end-of-body)."""
    pat = re.compile(r"\b" + re.escape(key) + r"\s*:\s*", re.MULTILINE)
    m = pat.search(body)
    if not m:
        return None
    i = m.end()
    depth_p = 0
    depth_c = 0
    depth_b = 0
    in_str = None
    in_template = 0
    start = i
    while i < len(body):
        c = body[i]
        nxt = body[i + 1] if i + 1 < len(body) else ""
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
        if c in "'\"":
            in_str = c
            i += 1
            continue
        if c == "`":
            in_template += 1
            i += 1
            continue
        if c == "(":
            depth_p += 1
        elif c == ")":
            depth_p -= 1
            if depth_p < 0:
                break
        elif c == "{":
            depth_c += 1
        elif c == "}":
            depth_c -= 1
            if depth_c < 0:
                break
        elif c == "[":
            depth_b += 1
        elif c == "]":
            depth_b -= 1
        elif c == "," and depth_p == 0 and depth_c == 0 and depth_b == 0:
            return body[start:i].strip()
        elif c == "\n" and depth_p == 0 and depth_c == 0 and depth_b == 0:
            # also stop at newline if we're at top-level (some tests omit trailing comma on last line)
            # but only if we've consumed at least one balanced expression; check if value looks complete
            v = body[start:i].strip()
            if v and (v.endswith(")") or v.endswith("}") or v.endswith("]") or re.match(r"^[\w'\"]+$", v)):
                return v
        i += 1
    v = body[start:i].strip()
    return v if v else None


def build_canonical(preserved: dict[str, str]) -> str:
    lines = [f"jest.mock('wagmi', () => ({{ {CANONICAL_SENTINEL}"]
    for key, default in DEFAULTS:
        val = preserved.get(key, default)
        lines.append(f"  {key}: {val},")
    lines.append("}))")
    return "\n".join(lines)


def patch_file(p: Path) -> bool:
    src = p.read_text()
    if CANONICAL_SENTINEL in src:
        return False
    m = START_RE.search(src)
    if not m:
        return False
    paren_open = src.find("(", m.start())
    if paren_open < 0:
        return False
    paren_close = find_call_end(src, paren_open)
    if paren_close < 0:
        return False
    old_call = src[m.start():paren_close + 1]
    # extract overrides for preserve keys
    preserved: dict[str, str] = {}
    for k in PRESERVE_KEYS:
        v = extract_value_for_key(old_call, k)
        if v:
            # only preserve values that are SINGLE-LINE and balanced
            if "\n" in v:
                continue
            if v.count("(") != v.count(")") or v.count("{") != v.count("}") or v.count("[") != v.count("]"):
                continue
            preserved[k] = v
    new_call = build_canonical(preserved)
    new_src = src[:m.start()] + new_call + src[paren_close + 1:]
    p.write_text(new_src)
    return True


def main():
    root = Path("__tests__")
    changed = 0
    for f in root.rglob("*.test.ts*"):
        try:
            if patch_file(f):
                changed += 1
        except Exception as e:
            print(f"ERROR {f}: {e}", file=sys.stderr)
    print(f"{changed} files repaired")


if __name__ == "__main__":
    main()
