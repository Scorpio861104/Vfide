#!/usr/bin/env python3
"""
Strip synthetic `* @param _<type> _<type>` lines from block-comment NatSpec.

Wave 2's mechanical NatSpec generator emitted lines like:
    /**
     * @notice onProposalQueued
     * @param id id
     * @param _address _address      ← bogus, no such param in signature
     * @param _uint256 _uint256      ← bogus
     */
    function onProposalQueued(uint256 id, address /*target*/, uint256 /*value*/)

For block-comment NatSpec we use a simple line-level filter: any `* @param _<type>`
line where _<type> is a Solidity built-in type name AND the function declaration
that follows doesn't have a parameter with that name should be stripped.

Same for `* @return _<type> _<type>` lines where return-count is exceeded.
"""
import re
import sys
from pathlib import Path

SYNTHETIC_TYPE_NAMES = {
    "_address", "_uint256", "_uint128", "_uint64", "_uint32", "_uint16", "_uint8",
    "_int256", "_int128", "_int64", "_int32", "_int16", "_int8",
    "_bool", "_bytes", "_bytes32", "_bytes16", "_bytes8", "_bytes4",
    "_string", "_arg",
}

FUNC_RE = re.compile(
    r'\b(?:function|modifier|constructor|receive|fallback)\b\s*'
    r'(?:[A-Za-z_]\w*\s*)?'
    r'\(([^)]*)\)',
    re.MULTILINE
)
RETURNS_RE = re.compile(r'\breturns\s*\(([^)]*)\)')

def extract_param_names(param_list_str):
    if not param_list_str.strip():
        return set()
    names = set()
    cleaned = re.sub(r'/\*.*?\*/', '', param_list_str)
    for part in cleaned.split(','):
        part = part.strip()
        if not part:
            continue
        tokens = part.split()
        if len(tokens) >= 2:
            last = tokens[-1]
            if last not in {"memory", "calldata", "storage", "indexed", "payable"}:
                names.add(last)
    return names

def fix_file(path):
    text = path.read_text()
    original = text
    pattern = re.compile(
        r'(/\*\*.*?\*/)\s*([^/\n]*?(?:function|modifier|constructor|receive|fallback)\b[^{;]*[{;])',
        re.DOTALL
    )
    
    def process_match(m):
        block = m.group(1)
        decl = m.group(2)
        fm = FUNC_RE.search(decl)
        if not fm:
            return m.group(0)
        param_names = extract_param_names(fm.group(1))
        rm = RETURNS_RE.search(decl[fm.end():])
        return_count = 0
        if rm:
            ret_str = rm.group(1).strip()
            if ret_str:
                return_count = len([p for p in ret_str.split(',') if p.strip()])
        
        lines = block.split('\n')
        new_lines = []
        return_seen = 0
        for line in lines:
            stripped = line.lstrip().lstrip('*').strip()
            pmatch = re.match(r'^@param\s+(\S+)\s', stripped)
            if pmatch:
                pname = pmatch.group(1)
                if pname not in param_names:
                    continue
            rmatch = re.match(r'^@return\s+(\S+)', stripped)
            if rmatch:
                return_seen += 1
                if return_seen > return_count:
                    continue
            new_lines.append(line)
        
        new_block = '\n'.join(new_lines)
        rest = m.group(0)[len(block):]
        return new_block + rest
    
    new_text = pattern.sub(process_match, text)
    
    if new_text != original:
        path.write_text(new_text)
        return True
    return False


def main():
    contracts_dir = Path("contracts")
    changed = []
    for sol_file in contracts_dir.rglob("*.sol"):
        if fix_file(sol_file):
            changed.append(str(sol_file))
    
    print(f"Changed {len(changed)} files:")
    for f in changed:
        print(f"  {f}")

if __name__ == "__main__":
    main()
