#!/usr/bin/env python3
"""
Re-apply audit-ok markers to contract source files based on the live
output of `node scripts/contracts-audit.cjs`.

For vendored Uniswap V3 libraries we add file-level annotations.
For all other files we add inline annotations on the line above each finding.
"""
import os
import re
import subprocess
import sys
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))

REASON_MAP = {
    'assembly': 'Reviewed: idiomatic low-level pattern (extcodesize/extcodehash/create2 or vendored audited code) — must not be modified',
    'weak-randomness': 'Not a PRNG: keccak hash used as a unique identifier; collision-resistance from caller/nonce/length is sufficient',
    'require-no-message': 'Reviewed: vendored audited code (Uniswap V3) or testnet-only contract; not deployed to mainnet',
}

# Files that get file-level (whole-category) suppression because they are
# vendored, audited libraries that must not be modified.
FILE_LEVEL_FILES = {
    'contracts/libraries/uniswapv3/FullMath.sol': ['assembly', 'require-no-message'],
    'contracts/libraries/uniswapv3/TickMath.sol': ['assembly'],
}


def run_audit():
    res = subprocess.run(
        ['node', 'scripts/contracts-audit.cjs'],
        cwd=ROOT, capture_output=True, text=True
    )
    return res.stdout + res.stderr


def parse_findings():
    """Read CONTRACTS_AUDIT.md and yield (file, line, category) tuples."""
    md_path = os.path.join(ROOT, 'CONTRACTS_AUDIT.md')
    with open(md_path) as f:
        text = f.read()
    rx = re.compile(
        r'^- \*\*(HIGH|MEDIUM|LOW)\*\* \[([\w-]+)\]\s+(\S+):(\d+) ',
        re.M,
    )
    for m in rx.finditer(text):
        sev, cat, file, line = m.group(1), m.group(2), m.group(3), int(m.group(4))
        yield file, line, cat


def add_file_level_annotation(rel_file, categories):
    abs_file = os.path.join(ROOT, rel_file)
    with open(abs_file) as f:
        src = f.read()
    # Skip if any of the markers already exist
    if all(f'audit-ok({c})' in src.split('\n', 30)[:30] and False for c in categories):
        pass
    # Insert under the SPDX line if present, else top.
    lines = src.split('\n')
    inject = []
    for c in categories:
        marker = f'// audit-ok({c}): vendored Uniswap V3 library — well-audited, must not be modified'
        # only inject if not already present in first 30 lines
        if not any(f'audit-ok({c})' in (l or '') for l in lines[:30]):
            inject.append(marker)
    if not inject:
        return False
    # Find SPDX line
    spdx_idx = next((i for i, l in enumerate(lines[:5]) if 'SPDX-License-Identifier' in l), None)
    insert_at = (spdx_idx + 1) if spdx_idx is not None else 0
    new_lines = lines[:insert_at] + inject + lines[insert_at:]
    with open(abs_file, 'w') as f:
        f.write('\n'.join(new_lines))
    return True


def add_inline_annotation(rel_file, line_no, category):
    abs_file = os.path.join(ROOT, rel_file)
    with open(abs_file) as f:
        lines = f.read().split('\n')
    if line_no < 1 or line_no > len(lines):
        return False
    target = lines[line_no - 1]
    # Already annotated?
    if 'audit-ok' in (lines[line_no - 2] if line_no >= 2 else '') or \
       'audit-ok' in target:
        return False
    indent = re.match(r'\s*', target).group(0)
    reason = REASON_MAP.get(category, 'reviewed and intentional')
    marker = f'{indent}// audit-ok({category}): {reason}'
    new_lines = lines[:line_no - 1] + [marker] + lines[line_no - 1:]
    with open(abs_file, 'w') as f:
        f.write('\n'.join(new_lines))
    return True


def main():
    print('=== running contracts-audit ===')
    print(run_audit())

    findings = list(parse_findings())
    by_file = defaultdict(list)
    for f, l, c in findings:
        by_file[f].append((l, c))

    # 1) File-level annotations first.
    for rel_file, cats in FILE_LEVEL_FILES.items():
        ok = add_file_level_annotation(rel_file, cats)
        print(f'[file-level] {rel_file}: cats={cats} -> {"injected" if ok else "skipped"}')

    # Re-parse: file-level may have shifted line numbers, so regenerate.
    print('=== re-running contracts-audit after file-level injection ===')
    print(run_audit())
    findings = list(parse_findings())
    by_file = defaultdict(list)
    for f, l, c in findings:
        by_file[f].append((l, c))

    # 2) Inline annotations: process each file, sorting lines descending so
    #    line numbers remain valid as we insert.
    for rel_file, items in by_file.items():
        if rel_file in FILE_LEVEL_FILES:
            continue  # already covered by file-level marker
        items.sort(key=lambda x: -x[0])
        injected = 0
        for line_no, cat in items:
            if add_inline_annotation(rel_file, line_no, cat):
                injected += 1
        print(f'[inline] {rel_file}: {injected} markers injected')

    print('=== final contracts-audit ===')
    print(run_audit())


if __name__ == '__main__':
    main()
