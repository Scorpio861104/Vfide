#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# VFIDE Slither Static Analysis Runner
# Fast pattern-based vulnerability detection
#
# Prerequisites:
#   pip install slither-analyzer
#   npm run compile
#
# Usage:
#   ./scripts/run-slither.sh                # Full analysis
#   ./scripts/run-slither.sh --sarif        # Output SARIF for GitHub
#   ./scripts/run-slither.sh --printers     # Run all printers (info gathering)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

REPORTS_DIR="reports/slither"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONFIG="slither.config.json"

if [ ! -f "$CONFIG" ] && [ -f "slither/slither.config.json" ]; then
  CONFIG="slither/slither.config.json"
fi

mkdir -p "$REPORTS_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
if ! command -v slither &> /dev/null; then
  log_error "Slither not installed. Run: pip install slither-analyzer"
  exit 1
fi

log_info "VFIDE Slither Analysis — $(date)"

# ─────────────────────────────────────────────
# 1. Core detector analysis
# ─────────────────────────────────────────────
run_detectors() {
  log_info "Running vulnerability detectors..."

  slither . \
    --config-file "$CONFIG" \
    --json "${REPORTS_DIR}/detectors_${TIMESTAMP}.json" \
    --markdown-root . \
    2>&1 | tee "${REPORTS_DIR}/detectors_${TIMESTAMP}.txt"

  log_info "Detector results: ${REPORTS_DIR}/detectors_${TIMESTAMP}.json"
}

# ─────────────────────────────────────────────
# 2. SARIF output for GitHub Code Scanning
# ─────────────────────────────────────────────
run_sarif() {
  log_info "Generating SARIF report..."

  slither . \
    --config-file "$CONFIG" \
    --sarif "${REPORTS_DIR}/slither_${TIMESTAMP}.sarif" \
    2>&1 || true

  log_info "SARIF report: ${REPORTS_DIR}/slither_${TIMESTAMP}.sarif"
}

# ─────────────────────────────────────────────
# 3. Information printers (architecture insights)
# ─────────────────────────────────────────────
run_printers() {
  log_info "Running information printers..."

  # Function summary
  slither . --print function-summary \
    --json "${REPORTS_DIR}/function_summary_${TIMESTAMP}.json" \
    2>/dev/null || true

  # Contract summary
  slither . --print contract-summary \
    --json "${REPORTS_DIR}/contract_summary_${TIMESTAMP}.json" \
    2>/dev/null || true

  # Human summary (readability)
  slither . --print human-summary \
    > "${REPORTS_DIR}/human_summary_${TIMESTAMP}.txt" \
    2>/dev/null || true

  # Call graph (for integration analysis)
  slither . --print call-graph \
    2>/dev/null || true

  # Inheritance graph
  slither . --print inheritance-graph \
    2>/dev/null || true

  # Variables order (storage layout — critical for upgrades)
  slither . --print variable-order \
    > "${REPORTS_DIR}/variable_order_${TIMESTAMP}.txt" \
    2>/dev/null || true

  # Data dependency
  slither . --print data-dependency \
    > "${REPORTS_DIR}/data_dependency_${TIMESTAMP}.txt" \
    2>/dev/null || true

  log_info "Printer reports saved to ${REPORTS_DIR}/"
}

# ─────────────────────────────────────────────
# 4. Custom VFIDE-specific checks
# ─────────────────────────────────────────────
run_custom_checks() {
  log_info "Running VFIDE-specific checks..."

  python3 - <<'PYTHON_EOF'
import json, re, glob, os

findings = []

# Check 1: Contracts using .transfer() or .transferFrom() without SafeERC20
for sol_file in glob.glob("contracts/**/*.sol", recursive=True):
    with open(sol_file) as f:
        content = f.read()
        name = os.path.basename(sol_file)

        # Raw transfer without SafeERC20
        if re.search(r'\.transfer\(', content) and 'using SafeERC20' not in content:
            if 'ERC20' not in name:  # Skip ERC20 base itself
                findings.append({
                    "file": sol_file,
                    "check": "unsafe-erc20-transfer",
                    "severity": "HIGH",
                    "detail": f"{name} uses .transfer() without SafeERC20"
                })

        # Raw transferFrom without SafeERC20
        if re.search(r'\.transferFrom\(', content) and 'using SafeERC20' not in content:
            if 'ERC20' not in name:
                findings.append({
                    "file": sol_file,
                    "check": "unsafe-erc20-transferFrom",
                    "severity": "HIGH",
                    "detail": f"{name} uses .transferFrom() without SafeERC20"
                })

        # External calls without nonReentrant
        if re.search(r'\.call\{value', content) and 'nonReentrant' not in content:
            findings.append({
                "file": sol_file,
                "check": "missing-reentrancy-guard",
                "severity": "HIGH",
                "detail": f"{name} has ETH .call{{value}} without nonReentrant"
            })

        # Missing zero-address checks on critical setters
        if re.search(r'function\s+set\w+\(address\s+', content):
            if 'require.*!= address(0)' not in content and 'address(0)' not in content:
                findings.append({
                    "file": sol_file,
                    "check": "missing-zero-check",
                    "severity": "MEDIUM",
                    "detail": f"{name} has address setter without zero-address check"
                })

        # Floating pragma
        if re.search(r'pragma solidity \^', content):
            findings.append({
                "file": sol_file,
                "check": "floating-pragma",
                "severity": "LOW",
                "detail": f"{name} uses floating pragma (^). Pin to exact version."
            })

# Check 2: Test coverage verification
tested_contracts = set()
for test_file in glob.glob("test/**/*.test.ts", recursive=True):
    with open(test_file) as f:
        content = f.read()
        for match in re.findall(r'describe\(["\'](\w+)', content):
            tested_contracts.add(match)

all_contracts = set()
for sol_file in glob.glob("contracts/*.sol"):
    name = os.path.basename(sol_file).replace(".sol", "")
    if not name.startswith("I") and not name.startswith("Mock"):
        all_contracts.add(name)

untested = all_contracts - tested_contracts
for c in untested:
    findings.append({
        "file": f"contracts/{c}.sol",
        "check": "missing-tests",
        "severity": "HIGH",
        "detail": f"{c} has no dedicated test file"
    })

# Save results
output = {
    "total": len(findings),
    "by_severity": {},
    "findings": findings
}
for f in findings:
    sev = f["severity"]
    output["by_severity"][sev] = output["by_severity"].get(sev, 0) + 1

os.makedirs("reports/slither", exist_ok=True)
with open("reports/slither/custom_checks.json", "w") as out:
    json.dump(output, out, indent=2)

print(f"\nCustom checks: {len(findings)} findings")
for sev, count in sorted(output["by_severity"].items()):
    print(f"  {sev}: {count}")
PYTHON_EOF
}

# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────
case "${1:-}" in
  --sarif)
    run_sarif
    ;;
  --printers)
    run_printers
    ;;
  --custom)
    run_custom_checks
    ;;
  *)
    run_detectors
    run_custom_checks
    echo ""
    log_info "═══════════════════════════════════════════"
    log_info "Full analysis complete. Reports in ${REPORTS_DIR}/"
    log_info "Run with --sarif for GitHub integration"
    log_info "Run with --printers for architecture info"
    log_info "═══════════════════════════════════════════"
    ;;
esac
