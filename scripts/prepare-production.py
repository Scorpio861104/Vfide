#!/usr/bin/env python3

import re
import os
import shutil
from pathlib import Path

print("🔧 Preparing production contracts...")
print("=" * 50)

# Create output directory
os.makedirs("contracts-prod/interfaces", exist_ok=True)
os.makedirs("contracts-prod/mocks", exist_ok=True)

def remove_test_functions(text):
    """Remove TEST_ functions and variables"""
    lines = text.split('\n')
    result = []
    in_test_func = False
    brace_depth = 0
    
    for line in lines:
        stripped = line.strip()
        
        # Skip TEST variable declarations
        if re.match(r'^\s*(bool|uint8|uint256)\s+(public\s+)?TEST_', line):
            continue
        
        # Detect TEST function start
        if re.match(r'^\s*function\s+TEST_', line):
            in_test_func = True
            brace_depth = 0
            continue
        
        # Skip TEST-related comments
        if any(pattern in stripped for pattern in ['// TEST', '// EXTRA:', '// Fine-grained', '// These helpers']):
            continue
            
        if in_test_func:
            # Count braces
            brace_depth += line.count('{')
            brace_depth -= line.count('}')
            
            # Exit TEST function when braces balance
            if brace_depth <= 0:
                in_test_func = False
            continue
        
        # Remove TEST variable references from code
        # Skip standalone if (TEST_xxx) statements that are guards
        if re.match(r'^\s*if\s*\(\s*TEST_\w+\s*\)\s*revert', line):
            continue
        if re.match(r'^\s*if\s*\(\s*TEST_\w+\s*\)\s*return', line):
            continue
        # Remove TEST from boolean expressions
        line = re.sub(r'\s*\|\|\s*TEST_\w+', '', line)
        line = re.sub(r'\s*&&\s*TEST_\w+', '', line)
        line = re.sub(r'\s*,\s*TEST_\w+', '', line)
        
        result.append(line)
    
    return '\n'.join(result)

def strip_test_functions(input_file, output_file):
    """Strip TEST functions from a contract file"""
    print(f"Processing {os.path.basename(input_file)}...")
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    original_size = len(content)
    cleaned = remove_test_functions(content)
    
    # Remove multiple consecutive blank lines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    new_size = len(cleaned)
    reduction = original_size - new_size
    percent = (reduction * 100) // original_size if original_size > 0 else 0
    
    with open(output_file, 'w') as f:
        f.write(cleaned)
    
    print(f"  ✓ Removed {reduction:,} bytes ({percent}%)")

# Process main contracts (strip TEST functions)
print("\n📦 Processing core contracts...")
strip_test_functions("contracts-min/VFIDECommerce.sol", "contracts-prod/VFIDECommerce.sol")
strip_test_functions("contracts-min/VFIDEFinance.sol", "contracts-prod/VFIDEFinance.sol")
strip_test_functions("contracts-min/VFIDEToken.sol", "contracts-prod/VFIDEToken.sol")

# Copy other contracts as-is
print("\n📋 Copying other contracts...")
contracts = [
    "DevReserveVestingVault", "DAO", "DAOTimelock", "CouncilElection",
    "EmergencyControl", "GovernanceHooks", "ProofLedger", "ProofScoreBurnRouter",
    "Seer", "SystemHandover", "VaultInfrastructure", "VFIDEPresale",
    "VFIDESecurity", "VFIDETrust"
]

for contract in contracts:
    src = f"contracts-min/{contract}.sol"
    dst = f"contracts-prod/{contract}.sol"
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"  ✓ {contract}.sol")

# Copy interfaces and mocks
print("\n📁 Copying interfaces and mocks...")
for subdir in ["interfaces", "mocks"]:
    src_dir = f"contracts-min/{subdir}"
    dst_dir = f"contracts-prod/{subdir}"
    if os.path.exists(src_dir):
        for item in os.listdir(src_dir):
            src_path = os.path.join(src_dir, item)
            dst_path = os.path.join(dst_dir, item)
            if os.path.isfile(src_path):
                shutil.copy2(src_path, dst_path)

print("\n✅ Production contracts ready in contracts-prod/")
print("📊 Run: PRODUCTION=1 npx hardhat size-contracts")
