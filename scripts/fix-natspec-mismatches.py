#!/usr/bin/env python3
"""
Fix Wave 2 NatSpec stubs that don't match actual function signatures.

Two issues:
  1. Synthetic `@param _address _address` (or _uint256 etc.) lines were generated
     for unnamed parameters. Solidity rejects these with DocstringParsingError.
     Strip them.
  2. Synthetic `@return _bool _bool` (or _uint256 etc.) lines were generated for
     functions where the return param count doesn't match. Strip them.

Strategy: For each function, parse its actual parameter and return-count signatures,
then strip `@param _<name>` lines whose name is a Solidity built-in type AND not
present in the parameter list. Same for `@return` lines exceeding return count.
"""
import re
import sys
from pathlib import Path

# Solidity built-in type names that Wave 2 used as fake param names
SYNTHETIC_TYPE_NAMES = {
    "_address", "_uint256", "_uint128", "_uint64", "_uint32", "_uint16", "_uint8",
    "_int256", "_int128", "_int64", "_int32", "_int16", "_int8",
    "_bool", "_bytes", "_bytes32", "_bytes16", "_bytes8", "_bytes4",
    "_string", "_arg",
}

# Match a function/modifier/constructor declaration and capture the param list
FUNC_RE = re.compile(
    r'\b(?:function|modifier|constructor|receive|fallback)\b\s*'
    r'(?:[A-Za-z_]\w*\s*)?'  # function name (optional for fallback/receive/constructor)
    r'\(([^)]*)\)',
    re.MULTILINE
)

def extract_param_names(param_list_str):
    """Given the contents inside (...), return the set of named parameters."""
    if not param_list_str.strip():
        return set()
    names = set()
    # Split on commas (naive — won't handle generics, but Solidity has no generics)
    for part in param_list_str.split(','):
        part = part.strip()
        if not part:
            continue
        # Strip storage modifiers: memory/calldata/storage
        # Example: "uint256 calldata foo" -> tokens
        tokens = part.split()
        # The parameter name (if any) is the LAST token, but only if there are >= 2 tokens
        # AND the last token isn't a type/modifier
        if len(tokens) >= 2:
            last = tokens[-1]
            # Filter out modifiers
            if last not in {"memory", "calldata", "storage", "indexed", "payable"}:
                names.add(last)
    return names

def fix_file(path):
    text = path.read_text()
    original = text
    lines = text.split('\n')
    new_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect a NatSpec block followed by a function declaration
        # Find natspec @param _<type> / @return _<type> lines
        # 
        # Approach: scan for a contiguous /// block, then look at the next non-/// line.
        # If it's a function declaration, parse its param list and strip mismatched lines.
        
        # Is this line a /// comment?
        stripped = line.lstrip()
        if not stripped.startswith('///'):
            new_lines.append(line)
            i += 1
            continue
        
        # Collect contiguous /// block
        block_start = i
        block_lines = []
        while i < len(lines) and lines[i].lstrip().startswith('///'):
            block_lines.append(lines[i])
            i += 1
        
        # i now points to the line AFTER the /// block. Find function declaration.
        # Look ahead a few lines for `function ... (...)` or similar.
        lookahead_text = '\n'.join(lines[i:i+15])  # 15 lines lookahead is enough
        
        m = FUNC_RE.search(lookahead_text)
        if not m or m.start() > 200:  # Function must be near the start of lookahead
            # No matching function — keep the block as-is
            new_lines.extend(block_lines)
            continue
        
        param_list_str = m.group(1)
        actual_param_names = extract_param_names(param_list_str)
        
        # Count return params: find `returns (...)` after the function decl
        ret_match = re.search(r'\breturns\s*\(([^)]*)\)', lookahead_text[m.start():])
        return_count = 0
        if ret_match:
            ret_str = ret_match.group(1).strip()
            if ret_str:
                return_count = len([p for p in ret_str.split(',') if p.strip()])
        
        # Filter the block: strip @param/@return lines that don't match
        filtered_block = []
        return_seen = 0
        for bline in block_lines:
            bstripped = bline.lstrip()
            
            # Check @param _<type>
            pmatch = re.match(r'^///\s*@param\s+(\S+)\s', bstripped)
            if pmatch:
                pname = pmatch.group(1)
                if pname in SYNTHETIC_TYPE_NAMES and pname not in actual_param_names:
                    # Strip this line
                    continue
                if pname not in actual_param_names and not pname.startswith('_') == False:
                    # Real param name but not in signature - strip too (e.g. "newOwner", "vault")
                    if pname not in actual_param_names:
                        continue
            
            # Check @return
            rmatch = re.match(r'^///\s*@return\s+(\S+)', bstripped)
            if rmatch:
                return_seen += 1
                if return_seen > return_count:
                    # Excess @return — strip
                    continue
                # If return_count == 1 but the name is a synthetic _<type>, that's fine
                # (single returns can be documented with just @return desc)
            
            filtered_block.append(bline)
        
        new_lines.extend(filtered_block)
    
    new_text = '\n'.join(new_lines)
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
    for f in changed[:20]:
        print(f"  {f}")
    if len(changed) > 20:
        print(f"  ... and {len(changed)-20} more")

if __name__ == "__main__":
    main()
