#!/bin/bash
# Security Analysis Runner for VFIDE Ecosystem
# Run this to execute all available security checks

set -e

echo "========================================="
echo "VFIDE Security Analysis Suite"
echo "========================================="

# Check if running in dev container
if [ -f "/.dockerenv" ]; then
    echo "✓ Running in dev container"
else
    echo "⚠ Not in dev container, some tools may not be available"
fi

# 1. Install Slither (Python static analyzer)
echo ""
echo "1. Installing Slither..."
if ! command -v slither &> /dev/null; then
    pip3 install slither-analyzer solc-select || echo "⚠ Slither installation failed"
    solc-select install 0.8.30 || echo "⚠ solc-select failed"
    solc-select use 0.8.30 || echo "⚠ solc-select use failed"
fi

# 2. Run Slither analysis
echo ""
echo "2. Running Slither static analysis..."
if command -v slither &> /dev/null; then
    mkdir -p security-reports
    slither contracts-min/ \
        --json security-reports/slither-report.json \
        --exclude-dependencies \
        --filter-paths "mocks" \
        2>&1 | tee security-reports/slither-output.txt || true
    echo "✓ Slither report saved to security-reports/"
else
    echo "⚠ Slither not available, skipping"
fi

# 3. Install Mythril (if possible)
echo ""
echo "3. Checking for Mythril..."
if ! command -v myth &> /dev/null; then
    echo "⚠ Mythril not installed (requires: pip3 install mythril)"
    echo "   Skipping symbolic execution analysis"
else
    echo "Running Mythril on critical contracts..."
    mkdir -p security-reports/mythril
    myth analyze contracts-min/VFIDEToken.sol --solv 0.8.30 > security-reports/mythril/token.txt 2>&1 || true
    myth analyze contracts-min/VFIDECommerce.sol --solv 0.8.30 > security-reports/mythril/commerce.txt 2>&1 || true
    echo "✓ Mythril reports saved"
fi

# 4. Run Hardhat tests with gas reporting
echo ""
echo "4. Running test suite with gas profiling..."
REPORT_GAS=true npx hardhat test 2>&1 | tee security-reports/gas-report.txt
echo "✓ Gas report saved"

# 5. Check for common vulnerabilities
echo ""
echo "5. Scanning for common vulnerability patterns..."
mkdir -p security-reports
cat > security-reports/vulnerability-scan.txt << 'EOF'
VFIDE Vulnerability Pattern Scan
================================

EOF

echo "Checking for unsafe external calls..."
grep -r "\.call{" contracts-min/ | grep -v "mocks" >> security-reports/vulnerability-scan.txt || echo "None found"

echo "Checking for delegatecall usage..."
grep -r "delegatecall" contracts-min/ | grep -v "mocks" >> security-reports/vulnerability-scan.txt || echo "None found"

echo "Checking for selfdestruct..."
grep -r "selfdestruct\|suicide" contracts-min/ | grep -v "mocks" >> security-reports/vulnerability-scan.txt || echo "None found"

echo "Checking for unchecked math..."
grep -r "unchecked" contracts-min/ | grep -v "mocks" >> security-reports/vulnerability-scan.txt || echo "None found"

echo "Checking for assembly usage..."
grep -r "assembly" contracts-min/ | grep -v "mocks" | head -20 >> security-reports/vulnerability-scan.txt || echo "None found"

echo "✓ Vulnerability scan complete"

# 6. Run coverage analysis
echo ""
echo "6. Generating code coverage report..."
npx hardhat coverage 2>&1 | tee security-reports/coverage-report.txt || true
echo "✓ Coverage report saved"

# 7. Summary
echo ""
echo "========================================="
echo "Security Analysis Complete!"
echo "========================================="
echo ""
echo "Reports generated in security-reports/:"
ls -lh security-reports/ 2>/dev/null || echo "No reports directory"
echo ""
echo "Next steps:"
echo "1. Review security-reports/slither-report.json for issues"
echo "2. Check security-reports/vulnerability-scan.txt"
echo "3. Review gas-report.txt for optimization opportunities"
echo "4. Run: npx hardhat test test/Security.Advanced.test.js"
echo "5. Consider professional audit from Trail of Bits, OpenZeppelin, or ConsenSys"
echo ""
echo "⚠️  For production deployment:"
echo "   - Complete all tests in Security.Advanced.test.js"
echo "   - Get external security audit"
echo "   - Launch bug bounty program"
echo "   - Implement continuous monitoring"
echo ""
