#!/bin/bash

# Production Contract Preparation Script
# Removes TEST_ helper functions for zkSync deployment

set -e

echo "🔧 Preparing production contracts..."
echo "=================================="

# Create output directory
mkdir -p contracts-prod/interfaces contracts-prod/mocks

# Function to strip TEST functions using Python (more reliable)
strip_test_functions() {
    local input_file=$1
    local output_file=$2
    
    echo "Processing $(basename $input_file)..."
    
    python3 << 'PYTHON_SCRIPT'
import re
import sys

input_file = sys.argv[1]
output_file = sys.argv[2]

with open(input_file, 'r') as f:
    content = f.read()

original_size = len(content)

# Remove TEST_ functions with proper brace matching
# Pattern: function TEST_... { ... } with nested braces handled
def remove_test_functions(text):
    lines = text.split('\n')
    result = []
    in_test_func = False
    brace_depth = 0
    skip_next_empty = False
    
    for line in lines:
        stripped = line.strip()
        
        # Detect TEST function start
        if re.match(r'^\s*function\s+TEST_', line):
            in_test_func = True
            brace_depth = 0
            continue
        
        # Skip TEST comment lines
        if re.match(r'^\s*//.*TEST', line):
            continue
        if re.match(r'^\s*//\s*EXTRA:.*coverage', line):
            continue
        if re.match(r'^\s*//\s*Fine-grained', line):
            continue
        if re.match(r'^\s*//\s*These helpers', line):
            continue
            
        if in_test_func:
            # Count braces
            brace_depth += line.count('{')
            brace_depth -= line.count('}')
            
            # Exit TEST function when braces balance
            if brace_depth <= 0:
                in_test_func = False
                skip_next_empty = True
            continue
        
        # Skip orphaned empty lines after TEST functions
        if skip_next_empty and stripped == '':
            skip_next_empty = False
            continue
        skip_next_empty = False
        
        result.append(line)
    
    return '\n'.join(result)

cleaned = remove_test_functions(content)

# Remove multiple consecutive blank lines
cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

new_size = len(cleaned)
reduction = original_size - new_size
percent = (reduction * 100) // original_size if original_size > 0 else 0

with open(output_file, 'w') as f:
    f.write(cleaned)

print(f"✓ Removed {reduction} bytes ({percent}%)")

PYTHON_SCRIPT
python3 -c "import sys; sys.argv = ['', '$input_file', '$output_file']; exec(open('/dev/stdin').read())" << 'PYTHON_SCRIPT'
import re
import sys

input_file = sys.argv[1]
output_file = sys.argv[2]

with open(input_file, 'r') as f:
    content = f.read()

original_size = len(content)

# Remove TEST_ functions with proper brace matching
def remove_test_functions(text):
    lines = text.split('\n')
    result = []
    in_test_func = False
    brace_depth = 0
    skip_next_empty = False
    
    for line in lines:
        stripped = line.strip()
        
        # Detect TEST function start
        if re.match(r'^\s*function\s+TEST_', line):
            in_test_func = True
            brace_depth = 0
            continue
        
        # Skip TEST comment lines
        if re.match(r'^\s*//.*TEST', line):
            continue
        if re.match(r'^\s*//\s*EXTRA:.*coverage', line):
            continue
        if re.match(r'^\s*//\s*Fine-grained', line):
            continue
        if re.match(r'^\s*//\s*These helpers', line):
            continue
            
        if in_test_func:
            # Count braces
            brace_depth += line.count('{')
            brace_depth -= line.count('}')
            
            # Exit TEST function when braces balance
            if brace_depth <= 0:
                in_test_func = False
                skip_next_empty = True
            continue
        
        # Skip orphaned empty lines after TEST functions
        if skip_next_empty and stripped == '':
            skip_next_empty = False
            continue
        skip_next_empty = False
        
        result.append(line)
    
    return '\n'.join(result)

cleaned = remove_test_functions(content)

# Remove multiple consecutive blank lines
cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

new_size = len(cleaned)
reduction = original_size - new_size
percent = (reduction * 100) // original_size if original_size > 0 else 0

with open(output_file, 'w') as f:
    f.write(cleaned)

print(f"✓ Removed {reduction} bytes ({percent}%)")
PYTHON_SCRIPT
}

echo "📦 Processing core contracts..."

# Process main contracts (strip TEST functions)
strip_test_functions "contracts-min/VFIDECommerce.sol" "contracts-prod/VFIDECommerce.sol"
strip_test_functions "contracts-min/VFIDEFinance.sol" "contracts-prod/VFIDEFinance.sol"
strip_test_functions "contracts-min/VFIDEToken.sol" "contracts-prod/VFIDEToken.sol"

# Copy other contracts as-is (no TEST functions)
echo ""
echo "📋 Copying other contracts..."

for contract in DevReserveVestingVault DAO DAOTimelock CouncilElection \
                EmergencyControl GovernanceHooks ProofLedger ProofScoreBurnRouter \
                Seer SystemHandover VaultInfrastructure VFIDEPresale \
                VFIDESecurity VFIDETrust; do
    if [ -f "contracts-min/${contract}.sol" ]; then
        cp "contracts-min/${contract}.sol" "contracts-prod/${contract}.sol"
        echo "✓ ${contract}.sol"
    fi
done

# Copy interface and mock directories
echo ""
echo "📁 Copying interfaces and mocks..."
cp -r contracts-min/interfaces/* contracts-prod/interfaces/ 2>/dev/null || true
cp -r contracts-min/mocks/* contracts-prod/mocks/ 2>/dev/null || true

echo ""
echo "✅ Production contracts ready in contracts-prod/"
echo "📊 Run: PRODUCTION=1 npx hardhat size-contracts"
