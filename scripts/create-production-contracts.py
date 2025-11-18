#!/usr/bin/env python3
"""
Create production-ready contracts by removing all TEST code.
Handles VFIDECommerce, VFIDEFinance, and VFIDEToken.
"""

import re
import os
import shutil

def clean_commerce(content):
    """Clean VFIDECommerce.sol - remove TEST variables, functions, and references"""
    lines = content.split('\n')
    result = []
    in_test_function = False
    brace_depth = 0
    test_function_started = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Skip TEST variable declarations
        if re.match(r'^\s*bool\s+public\s+TEST_', line):
            continue
        
        # Skip TEST setter functions (single line body)
        if re.match(r'^\s*function\s+TEST_set\w+\(bool\s+v\)\s+external\s*\{.*\}\s*$', line):
            continue
        
        # Skip TEST comment blocks
        if '// TEST' in line or '// EXTRA:' in line or '// Fine-grained' in line or '// Additional TEST' in line:
            if not any(keyword in line for keyword in ['contract', 'interface', 'struct']):
                continue
        
        # Detect start of TEST_ function block
        if 'function TEST_' in line:
            in_test_function = True
            test_function_started = False  # Haven't seen opening brace yet
            brace_depth = line.count('{') - line.count('}')
            if brace_depth > 0:
                test_function_started = True
            continue
        
        # If in TEST function, track braces and skip until function ends
        if in_test_function:
            open_count = line.count('{')
            close_count = line.count('}')
            
            if open_count > 0:
                test_function_started = True
            
            brace_depth += open_count
            brace_depth -= close_count
            
            # Only exit when we've seen opening brace AND depth returns to 0 or negative
            if test_function_started and brace_depth <= 0:
                in_test_function = False
                test_function_started = False
                brace_depth = 0
            continue
        
        # Remove TEST references from modifier
        if 'modifier onlyDAO()' in line and 'TEST_onlyDAO_off' in line:
            line = line.replace(' && !TEST_onlyDAO_off', '')
        
        # Remove TEST guard statements
        if re.match(r'^\s*if\s*\(\s*TEST_\w+\s*\)\s+(revert|return)', line):
            continue
        
        # Remove TEST from boolean expressions
        line = re.sub(r'\s*\|\|\s*TEST_\w+', '', line)
        line = re.sub(r'\s*&&\s*TEST_\w+', '', line)
        
        result.append(line)
    
    # Clean up multiple blank lines
    cleaned = '\n'.join(result)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned

def clean_finance(content):
    """Clean VFIDEFinance.sol - remove TEST code from both contracts"""
    lines = content.split('\n')
    result = []
    in_test_function = False
    brace_depth = 0
    test_function_started = False
    
    for line in lines:
        stripped = line.strip()
        
        # Skip TEST variable declarations
        if re.match(r'^\s*(bool|uint8)\s+public\s+TEST_', line):
            continue
        
        # Skip TEST comments
        if '// TEST' in line or '// EXTRA:' in line or '// Additional TEST' in line:
            if 'contract' not in line:
                continue
        
        # Remove TEST from modifiers BEFORE checking TEST functions
        if 'modifier onlyDAO()' in line and ('TEST_onlyDAO_off' in line or 'TEST_onlyDAO_off_tx' in line):
            # Replace the entire TEST condition, not just parts
            line = re.sub(r'\s*&&\s*!TEST_onlyDAO_off(_tx)?', '', line)
            result.append(line)
            continue
        
        # Detect start of TEST_ function block
        if 'function TEST_' in line:
            in_test_function = True
            test_function_started = False  # Haven't seen opening brace yet
            brace_depth = line.count('{') - line.count('}')
            if brace_depth > 0:
                test_function_started = True
            continue
        
        # If in TEST function, track braces and skip until function ends
        if in_test_function:
            open_count = line.count('{')
            close_count = line.count('}')
            
            if open_count > 0:
                test_function_started = True
            
            brace_depth += open_count
            brace_depth -= close_count
            
            # Only exit when we've seen opening brace AND depth returns to 0 or negative
            if test_function_started and brace_depth <= 0:
                in_test_function = False
                test_function_started = False
                brace_depth = 0
            continue
        
        # Remove TEST guard statements
        if re.match(r'^\s*if\s*\(\s*TEST_\w+\s*\)\s+(revert|return)', line):
            continue
        
        # Remove TEST from boolean expressions
        line = re.sub(r'\s*\|\|\s*TEST_\w+', '', line)
        line = re.sub(r'\s*&&\s*TEST_\w+', '', line)
        line = re.sub(r'if\s*\(\s*TEST_\w+\s*\)\s+return\s+\w+;', '', line)
        
        result.append(line)
    
    cleaned = '\n'.join(result)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned

def clean_token(content):
    """Clean VFIDEToken.sol - remove TEST code"""
    lines = content.split('\n')
    result = []
    in_test_function = False
    brace_depth = 0
    test_function_started = False
    
    for line in lines:
        stripped = line.strip()
        
        # Skip TEST variable declarations
        if re.match(r'^\s*bool\s+public\s+TEST_', line):
            continue
        
        # Skip TEST comments
        if '// TEST' in line or '// execute the router' in line:
            if 'contract' not in line:
                continue
        
        # Detect start of TEST_ function block
        if 'function TEST_' in line:
            in_test_function = True
            test_function_started = False
            brace_depth = line.count('{') - line.count('}')
            if brace_depth > 0:
                test_function_started = True
            continue
        
        if in_test_function:
            open_count = line.count('{')
            close_count = line.count('}')
            
            if open_count > 0:
                test_function_started = True
            
            brace_depth += open_count
            brace_depth -= close_count
            
            # Only exit when we've seen opening brace AND depth returns to 0 or negative
            if test_function_started and brace_depth <= 0:
                in_test_function = False
                test_function_started = False
                brace_depth = 0
            continue
        
        # Remove TEST guard statements
        if re.match(r'^\s*if\s*\(\s*TEST_\w+\s*\)', line):
            continue
        
        # Remove TEST from boolean expressions
        line = re.sub(r'\s*\|\|\s*TEST_\w+', '', line)
        line = re.sub(r'\s*&&\s*TEST_\w+', '', line)
        
        result.append(line)
    
    cleaned = '\n'.join(result)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned

def main():
    print("🔧 Creating production contracts...")
    print("=" * 50)
    
    # Create output directory
    os.makedirs("contracts-prod/interfaces", exist_ok=True)
    os.makedirs("contracts-prod/mocks", exist_ok=True)
    
    # Process VFIDECommerce
    print("\n📦 Processing VFIDECommerce.sol...")
    with open("contracts-min/VFIDECommerce.sol", 'r') as f:
        commerce_content = f.read()
    original_size = len(commerce_content)
    cleaned_commerce = clean_commerce(commerce_content)
    new_size = len(cleaned_commerce)
    reduction = original_size - new_size
    percent = (reduction * 100) // original_size
    
    with open("contracts-prod/VFIDECommerce.sol", 'w') as f:
        f.write(cleaned_commerce)
    print(f"  ✓ Removed {reduction:,} bytes ({percent}%)")
    
    # Process VFIDEFinance
    print("\n📦 Processing VFIDEFinance.sol...")
    with open("contracts-min/VFIDEFinance.sol", 'r') as f:
        finance_content = f.read()
    original_size = len(finance_content)
    cleaned_finance = clean_finance(finance_content)
    new_size = len(cleaned_finance)
    reduction = original_size - new_size
    percent = (reduction * 100) // original_size
    
    with open("contracts-prod/VFIDEFinance.sol", 'w') as f:
        f.write(cleaned_finance)
    print(f"  ✓ Removed {reduction:,} bytes ({percent}%)")
    
    # Process VFIDEToken
    print("\n📦 Processing VFIDEToken.sol...")
    with open("contracts-min/VFIDEToken.sol", 'r') as f:
        token_content = f.read()
    original_size = len(token_content)
    cleaned_token = clean_token(token_content)
    new_size = len(cleaned_token)
    reduction = original_size - new_size
    percent = (reduction * 100) // original_size
    
    with open("contracts-prod/VFIDEToken.sol", 'w') as f:
        f.write(cleaned_token)
    print(f"  ✓ Removed {reduction:,} bytes ({percent}%)")
    
    # Copy other contracts
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
    print("📊 Next: PRODUCTION=1 npx hardhat compile --force")

if __name__ == "__main__":
    main()
