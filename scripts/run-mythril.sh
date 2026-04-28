#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# VFIDE Mythril Deep Analysis Runner
# Symbolic execution for vulnerability detection
#
# Prerequisites:
#   pip install mythril
#   npm run compile (Hardhat artifacts required)
#
# Usage:
#   ./scripts/run-mythril.sh                    # All contracts
#   ./scripts/run-mythril.sh VFIDEBridge        # Single contract
#   ./scripts/run-mythril.sh --critical-only    # Only critical contracts
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

REPORTS_DIR="reports/mythril"
CONTRACTS_DIR="contracts"
ARTIFACTS_DIR="artifacts/contracts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TIMEOUT=900  # 15 minutes per contract
MAX_DEPTH=24
SOLC_VERSION="0.8.19"

# Critical contracts (findings C-01 through C-06 + untested high-value)
CRITICAL_CONTRACTS=(
  "RevenueSplitter"
  "VFIDEEnterpriseGateway"
  "OwnerControlPanel"
  "VFIDEBridge"
  "VFIDEFinance"
  "VaultHub"
  "VaultInfrastructure"
  "CircuitBreaker"
  "AdminMultiSig"
  "EscrowManager"
  "CardBoundVault"
  "VFIDEToken"
  "DAO"
  "DAOTimelock"
  "SanctumVault"
  "EcosystemVault"
)

# All audited contracts
ALL_CONTRACTS=(
  "${CRITICAL_CONTRACTS[@]}"
  "Seer"
  "SeerAutonomous"
  "SeerGuardian"
  "SeerSocial"
  "SeerPolicyGuard"
  "SeerView"
  "VFIDECommerce"
  "VFIDESecurity"
  "VFIDEAccessControl"
  "ProofLedger"
  "ProofScoreBurnRouter"
  "VFIDEBadgeNFT"
  "BadgeManager"
  "BadgeRegistry"
  "BadgeQualificationRules"
  "BridgeSecurityModule"
  "CouncilElection"
  "CouncilManager"
  "CouncilSalary"
  "DevReserveVestingVault"
  "DutyDistributor"
  "EmergencyControl"
  "GovernanceHooks"
  "LiquidityIncentives"
  "MerchantPortal"
  "PayrollManager"
  "SubscriptionManager"
  "StablecoinRegistry"
  "VFIDEPriceOracle"
  "VFIDEBenefits"
  "VaultRecoveryClaim"
  "VaultRegistry"
  "SystemHandover"
)

mkdir -p "$REPORTS_DIR"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─────────────────────────────────────────────
# Analyze a single contract
# ─────────────────────────────────────────────
analyze_contract() {
  local contract_name="$1"
  local sol_file="${CONTRACTS_DIR}/${contract_name}.sol"
  local report_file="${REPORTS_DIR}/${contract_name}_${TIMESTAMP}.json"
  local report_md="${REPORTS_DIR}/${contract_name}_${TIMESTAMP}.md"

  if [ ! -f "$sol_file" ]; then
    log_warn "File not found: $sol_file — skipping"
    return 1
  fi

  log_info "Analyzing ${contract_name} (timeout: ${TIMEOUT}s, depth: ${MAX_DEPTH})..."

  # Run Mythril with multiple analysis modules
  timeout "$TIMEOUT" myth analyze \
    "$sol_file" \
    --solv "$SOLC_VERSION" \
    --max-depth "$MAX_DEPTH" \
    --execution-timeout "$TIMEOUT" \
    --solver-timeout 30 \
    --strategy bfs \
    --modules "ether_thief,suicide,state_change_external_calls,delegatecall,integer,multiple_sends,unchecked_retval,user_assertions" \
    -o json \
    > "$report_file" 2>&1 || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        log_warn "${contract_name}: Timed out after ${TIMEOUT}s (partial results saved)"
      else
        log_error "${contract_name}: Mythril exited with code $exit_code"
      fi
    }

  # Also generate markdown report
  timeout "$TIMEOUT" myth analyze \
    "$sol_file" \
    --solv "$SOLC_VERSION" \
    --max-depth "$MAX_DEPTH" \
    --execution-timeout "$TIMEOUT" \
    --solver-timeout 30 \
    --strategy bfs \
    -o markdown \
    > "$report_md" 2>&1 || true

  # Count findings
  if [ -f "$report_file" ]; then
    local count
    count=$(python3 -c "
import json, sys
try:
    data = json.load(open('$report_file'))
    issues = data.get('issues', []) if isinstance(data, dict) else data if isinstance(data, list) else []
    print(len(issues))
except:
    print(0)
" 2>/dev/null || echo "0")
    if [ "$count" -gt 0 ]; then
      log_warn "${contract_name}: ${count} potential issues found"
    else
      log_info "${contract_name}: No issues detected"
    fi
  fi

  return 0
}

# ─────────────────────────────────────────────
# Main execution
# ─────────────────────────────────────────────
main() {
  log_info "VFIDE Mythril Analysis — $(date)"
  log_info "Solidity version: ${SOLC_VERSION}"
  log_info "Max depth: ${MAX_DEPTH}, Timeout: ${TIMEOUT}s per contract"

  # Check Mythril installation
  if ! command -v myth &> /dev/null; then
    log_error "Mythril not installed. Run: pip install mythril"
    exit 1
  fi

  local contracts_to_analyze=()

  if [ "${1:-}" = "--critical-only" ]; then
    contracts_to_analyze=("${CRITICAL_CONTRACTS[@]}")
    log_info "Mode: Critical contracts only (${#contracts_to_analyze[@]} contracts)"
  elif [ -n "${1:-}" ]; then
    contracts_to_analyze=("$1")
    log_info "Mode: Single contract — $1"
  else
    contracts_to_analyze=("${ALL_CONTRACTS[@]}")
    log_info "Mode: Full scan (${#contracts_to_analyze[@]} contracts)"
  fi

  local passed=0
  local failed=0
  local issues_total=0

  for contract in "${contracts_to_analyze[@]}"; do
    if analyze_contract "$contract"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  # Generate summary
  log_info "═══════════════════════════════════════════"
  log_info "Mythril Analysis Complete"
  log_info "Contracts analyzed: $((passed + failed))"
  log_info "Successful: ${passed}"
  log_info "Failed/Skipped: ${failed}"
  log_info "Reports: ${REPORTS_DIR}/"
  log_info "═══════════════════════════════════════════"

  # Aggregate findings into single report
  python3 - <<'PYTHON_SCRIPT'
import json, os, glob

reports_dir = os.environ.get("REPORTS_DIR", "reports/mythril")
all_findings = []

for f in glob.glob(f"{reports_dir}/*_*.json"):
    try:
        data = json.load(open(f))
        issues = data.get("issues", []) if isinstance(data, dict) else data if isinstance(data, list) else []
        contract_name = os.path.basename(f).rsplit("_", 2)[0]
        for issue in issues:
            issue["contract"] = contract_name
            all_findings.append(issue)
    except:
        pass

summary = {
    "total_findings": len(all_findings),
    "by_severity": {},
    "findings": all_findings
}

for f in all_findings:
    sev = f.get("severity", "Unknown")
    summary["by_severity"][sev] = summary["by_severity"].get(sev, 0) + 1

with open(f"{reports_dir}/SUMMARY.json", "w") as out:
    json.dump(summary, out, indent=2)

print(f"\nAggregated {len(all_findings)} findings into {reports_dir}/SUMMARY.json")
for sev, count in sorted(summary["by_severity"].items()):
    print(f"  {sev}: {count}")
PYTHON_SCRIPT
}

main "$@"
