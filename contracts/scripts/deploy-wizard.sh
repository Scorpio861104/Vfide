#!/usr/bin/env bash
# =============================================================================
#  VFIDE Deployment Wizard
#  One script to deploy, wire, vest, and hand over — no commands to memorise.
#
#  Usage:
#    bash contracts/scripts/deploy-wizard.sh
#
#  The wizard remembers where you left off between sessions by writing a
#  state file: .deploy-state.json  (in the repo root, git-ignored).
# =============================================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_FILE="${REPO_ROOT}/.deploy-state.json"
ENV_FILE="${REPO_ROOT}/.env"

# ── Helpers ───────────────────────────────────────────────────────────────────

# Print a step banner
banner() {
  echo ""
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════${RESET}"
  echo -e "${CYAN}${BOLD}  $1${RESET}"
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════════════${RESET}"
}

info()    { echo -e "${CYAN}ℹ  $*${RESET}"; }
ok()      { echo -e "${GREEN}✓  $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
err()     { echo -e "${RED}✗  $*${RESET}"; }
bold()    { echo -e "${BOLD}$*${RESET}"; }

# Read a value from the .deploy-state.json file (returns empty string if missing)
state_get() {
  local key="$1"
  if [ -f "$STATE_FILE" ]; then
    node -e "
      try {
        const s = JSON.parse(require('fs').readFileSync('$STATE_FILE','utf8'));
        process.stdout.write(String(s['$key'] ?? ''));
      } catch(e) { process.stdout.write(''); }
    " 2>/dev/null || true
  fi
}

# Write / update a key-value pair in the state file
state_set() {
  local key="$1"
  local val="$2"
  node -e "
    const fs = require('fs');
    let s = {};
    try { s = JSON.parse(fs.readFileSync('$STATE_FILE','utf8')); } catch(e){}
    s['$key'] = '$val';
    fs.writeFileSync('$STATE_FILE', JSON.stringify(s, null, 2));
  " 2>/dev/null
}

# Read a single value from the deployment manifest saved by deploy-solo.ts
manifest_addr() {
  local key="$1"
  local mf; mf="$(state_get manifest_file)"
  if [ -z "$mf" ] || [ ! -f "${REPO_ROOT}/${mf}" ]; then
    echo ""
    return
  fi
  node -e "
    try {
      const m = JSON.parse(require('fs').readFileSync('${REPO_ROOT}/${mf}','utf8'));
      process.stdout.write(String(m.addresses['$key'] ?? ''));
    } catch(e) { process.stdout.write(''); }
  " 2>/dev/null || true
}

# Load a value from .env if it exists
env_get() {
  local key="$1"
  if [ -f "$ENV_FILE" ]; then
    grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | sed 's/^[^=]*=//' | tr -d '"' | tr -d "'" || true
  fi
}

# Write KEY=VALUE to .env (adds if missing, updates if present)
env_set() {
  local key="$1"
  local val="$2"
  if [ -f "$ENV_FILE" ] && grep -qE "^${key}=" "$ENV_FILE"; then
    # Update existing line (works on both Linux and macOS)
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

# Prompt the user for a value; default shown in brackets
ask() {
  local prompt="$1"
  local default="${2:-}"
  local var_name="$3"
  local input
  if [ -n "$default" ]; then
    echo -ne "${BOLD}${prompt}${RESET} ${DIM}[${default}]${RESET}: "
  else
    echo -ne "${BOLD}${prompt}${RESET}: "
  fi
  read -r input
  if [ -z "$input" ] && [ -n "$default" ]; then
    input="$default"
  fi
  # Export to caller via nameref-free printf trick
  eval "${var_name}='${input}'"
}

# Prompt for a sensitive value (no echo)
ask_secret() {
  local prompt="$1"
  local var_name="$2"
  echo -ne "${BOLD}${prompt}${RESET}: "
  read -rs input
  echo ""
  eval "${var_name}='${input}'"
}

# Check if node / hardhat are available
require_deps() {
  if ! command -v node &>/dev/null; then
    err "node is not installed. Install Node.js 18+ from https://nodejs.org"
    exit 1
  fi
  if ! (cd "$REPO_ROOT" && node -e "require('hardhat')" 2>/dev/null); then
    err "hardhat not found. Run: npm install  (in the repo root)"
    exit 1
  fi
}

# Seconds since epoch
now_ts() { node -e "process.stdout.write(String(Math.floor(Date.now()/1000)))"; }

# Human-readable duration remaining until a future timestamp
secs_remaining() {
  local future="$1"
  local now; now="$(now_ts)"
  local diff=$(( future - now ))
  if [ "$diff" -le 0 ]; then
    echo "0"
    return
  fi
  local h=$(( diff / 3600 ))
  local m=$(( (diff % 3600) / 60 ))
  echo "${h}h ${m}m"
}

# ── Status helpers ────────────────────────────────────────────────────────────

step_done()    { echo -e "  ${GREEN}[✓ DONE]${RESET}"; }
step_pending() { echo -e "  ${YELLOW}[○ NOT YET]${RESET}"; }
step_waiting() { echo -e "  ${YELLOW}[⏳ WAITING — $1]${RESET}"; }
step_ready()   { echo -e "  ${CYAN}[→ READY TO RUN]${RESET}"; }

print_status() {
  banner "Current Deployment Status"

  local network; network="$(state_get network)"
  local deployed_at; deployed_at="$(state_get deployed_at)"
  local wiring_done; wiring_done="$(state_get wiring_done)"
  local vesting_done; vesting_done="$(state_get vesting_done)"
  local handover_done; handover_done="$(state_get handover_done)"
  local manifest; manifest="$(state_get manifest_file)"
  local wiring_ready_at; wiring_ready_at="$(state_get wiring_ready_at)"

  echo ""
  echo -e "  Network  : ${BOLD}${network:-not set}${RESET}"
  if [ -n "$manifest" ] && [ -f "${REPO_ROOT}/${manifest}" ]; then
    echo -e "  Manifest : ${DIM}${manifest}${RESET}"
    echo ""
    echo -e "  ${DIM}Addresses:${RESET}"
    for key in proofLedger securityHub vaultHub devReserveVestingVault vfideToken seer proofScoreBurnRouter ownerControlPanel systemHandover; do
      local addr; addr="$(manifest_addr "$key")"
      if [ -n "$addr" ] && [ "$addr" != "null" ]; then
        printf "    %-28s %s\n" "${key}:" "${addr}"
      fi
    done
  fi
  echo ""

  # Step 1
  echo -ne "  Step 1 — Deploy contracts       "
  if [ -n "$deployed_at" ]; then step_done; else step_pending; fi

  # Step 2
  local now; now="$(now_ts)"
  echo -ne "  Step 2 — Apply wiring (48h wait)"
  if [ "$wiring_done" = "true" ]; then
    step_done
  elif [ -z "$deployed_at" ]; then
    step_pending
  elif [ -n "$wiring_ready_at" ] && [ "$now" -lt "$wiring_ready_at" ]; then
    local rem; rem="$(secs_remaining "$wiring_ready_at")"
    step_waiting "$rem remaining"
  else
    step_ready
  fi

  # Step 3
  echo -ne "  Step 3 — Start vesting          "
  if [ "$vesting_done" = "true" ]; then step_done
  elif [ -z "$deployed_at" ]; then step_pending
  else step_ready; fi

  # Step 4
  echo -ne "  Step 4 — Arm handover           "
  if [ "$handover_done" = "true" ]; then step_done
  elif [ -z "$deployed_at" ]; then step_pending
  else step_ready; fi

  echo ""
}

# ── Step runners ──────────────────────────────────────────────────────────────

run_step1_deploy() {
  banner "Step 1 — Deploy All Contracts"

  local deployed_at; deployed_at="$(state_get deployed_at)"
  if [ -n "$deployed_at" ]; then
    warn "Contracts already deployed on $(state_get network)."
    ask "Re-deploy from scratch? This creates a NEW set of contracts (y/N)" "N" _confirm
    case "$_confirm" in [Yy]) ;; *) info "Skipping."; return ;; esac
  fi

  # ── Collect config ─────────────────────────────────────────────────────────
  echo ""
  bold "Choose a network:"
  echo "  1) baseSepolia (Base Sepolia testnet — recommended)"
  echo "  2) sepolia     (Ethereum Sepolia testnet)"
  echo "  3) polygonAmoy (Polygon Amoy testnet)"
  echo "  4) mainnet"
  echo "  5) base"
  echo "  6) polygon"
  echo "  7) hardhat     (local node — for testing only)"
  ask "Your choice" "1" _net_choice
  case "$_net_choice" in
    1|baseSepolia)  NET="baseSepolia"  ;;
    2|sepolia)      NET="sepolia"      ;;
    3|polygonAmoy)  NET="polygonAmoy"  ;;
    4|mainnet)      NET="mainnet"      ;;
    5|base)         NET="base"         ;;
    6|polygon)      NET="polygon"      ;;
    7|hardhat)      NET="hardhat"      ;;
    *)              NET="$_net_choice"  ;;
  esac

  # PRIVATE_KEY
  local pk; pk="$(env_get PRIVATE_KEY)"
  if [ -z "$pk" ] || [ "$pk" = "your_private_key_here_without_0x_prefix" ]; then
    warn "PRIVATE_KEY is not set in .env"
    ask_secret "Enter your deployer private key (no 0x prefix)" pk
    env_set PRIVATE_KEY "$pk"
    ok "Saved to .env"
  else
    ok "PRIVATE_KEY found in .env"
  fi

  # OWNER_ADDRESS
  local owner; owner="$(env_get OWNER_ADDRESS)"
  if [ -z "$owner" ]; then
    ask "Owner / admin address (your wallet address)" "" owner
    env_set OWNER_ADDRESS "$owner"
  else
    ok "OWNER_ADDRESS: $owner"
    ask "Use this address? (Y/n)" "Y" _use_owner
    case "$_use_owner" in [Nn]) ask "New owner address" "" owner; env_set OWNER_ADDRESS "$owner" ;; esac
  fi

  # TREASURY_ADDRESS (optional — defaults to owner)
  local treasury; treasury="$(env_get TREASURY_ADDRESS)"
  if [ -z "$treasury" ]; then
    ask "Treasury address (press Enter to use owner address)" "$owner" treasury
    if [ -n "$treasury" ] && [ "$treasury" != "$owner" ]; then
      env_set TREASURY_ADDRESS "$treasury"
    fi
  else
    ok "TREASURY_ADDRESS: $treasury"
  fi

  # BENEFICIARY_ADDRESS (optional — defaults to owner)
  local beneficiary; beneficiary="$(env_get BENEFICIARY_ADDRESS)"
  if [ -z "$beneficiary" ]; then
    ask "Beneficiary address for vesting (press Enter to use owner)" "$owner" beneficiary
    if [ -n "$beneficiary" ] && [ "$beneficiary" != "$owner" ]; then
      env_set BENEFICIARY_ADDRESS "$beneficiary"
    fi
  else
    ok "BENEFICIARY_ADDRESS: $beneficiary"
  fi

  # Optional ProofScoreBurnRouter sinks
  echo ""
  bold "ProofScoreBurnRouter (optional — can be added later):"
  info "Requires 3 distinct sink addresses: Sanctum, Burn, Ecosystem."
  ask "Set up BurnRouter now? (y/N)" "N" _setup_router
  case "$_setup_router" in
    [Yy])
      ask "SANCTUM_SINK address" "" _sanctum; env_set SANCTUM_SINK "$_sanctum"
      ask "BURN_SINK address"    "" _burn;    env_set BURN_SINK    "$_burn"
      ask "ECOSYSTEM_SINK address" "" _eco;   env_set ECOSYSTEM_SINK "$_eco"
      ;;
  esac

  # VERIFY_CONTRACTS
  ask "Verify contracts on block explorer after deploy? (y/N)" "N" _verify
  case "$_verify" in [Yy]) env_set VERIFY_CONTRACTS "true" ;; *) env_set VERIFY_CONTRACTS "false" ;; esac

  echo ""
  warn "About to deploy to: ${BOLD}${NET}${RESET}"
  warn "Make sure your wallet is funded with enough ETH for gas."
  ask "Proceed? (Y/n)" "Y" _go
  case "$_go" in [Nn]) info "Aborted."; return ;; esac

  echo ""
  info "Running deploy-solo.ts on ${NET}…"
  echo ""

  (cd "$REPO_ROOT" && \
    HARDHAT_NETWORK="$NET" \
    npx hardhat run contracts/scripts/deploy-solo.ts --network "$NET"
  )

  # Find the manifest file just written
  local mf; mf="$(ls -t "${REPO_ROOT}"/deployments-solo-*.json 2>/dev/null | head -1 | xargs -I{} basename {} 2>/dev/null || true)"
  if [ -z "$mf" ]; then
    err "Could not find deployment manifest. Check output above for errors."
    return 1
  fi

  local ts; ts="$(now_ts)"
  local wiring_ready=$(( ts + 48*3600 ))
  state_set network       "$NET"
  state_set deployed_at   "$ts"
  state_set manifest_file "$mf"
  state_set wiring_ready_at "$wiring_ready"

  echo ""
  ok "Deployment complete! Manifest: ${mf}"
  info "Step 2 (apply wiring) will be ready in 48 hours."
}

run_step2_wiring() {
  banner "Step 2 — Apply 48-Hour Timelocked Wiring"

  local deployed_at; deployed_at="$(state_get deployed_at)"
  if [ -z "$deployed_at" ]; then
    err "No deployment found. Run Step 1 first."
    return 1
  fi

  local wiring_done; wiring_done="$(state_get wiring_done)"
  if [ "$wiring_done" = "true" ]; then
    ok "Wiring already applied."
    return
  fi

  local wiring_ready_at; wiring_ready_at="$(state_get wiring_ready_at)"
  local now; now="$(now_ts)"
  if [ -n "$wiring_ready_at" ] && [ "$now" -lt "$wiring_ready_at" ]; then
    local rem; rem="$(secs_remaining "$wiring_ready_at")"
    err "Timelock has not expired yet. ${rem} remaining."
    info "Come back later and run the wizard again — it will detect when it's ready."
    return 1
  fi

  local net; net="$(state_get network)"
  local mf; mf="$(state_get manifest_file)"
  if [ -z "$mf" ] || [ ! -f "${REPO_ROOT}/${mf}" ]; then
    err "Deployment manifest not found: ${mf}"
    err "Set DEPLOYMENT_FILE env var manually and run apply-wiring.ts directly."
    return 1
  fi

  info "Applying SecurityHub + BurnRouter wiring on ${net}…"
  echo ""

  (cd "$REPO_ROOT" && \
    DEPLOYMENT_FILE="$mf" \
    npx hardhat run contracts/scripts/apply-wiring.ts --network "$net"
  )

  state_set wiring_done "true"
  ok "Wiring applied successfully!"
}

run_step3_vesting() {
  banner "Step 3 — Start Vesting Schedule"

  local deployed_at; deployed_at="$(state_get deployed_at)"
  if [ -z "$deployed_at" ]; then
    err "No deployment found. Run Step 1 first."
    return 1
  fi

  local vesting_done; vesting_done="$(state_get vesting_done)"
  if [ "$vesting_done" = "true" ]; then
    ok "Vesting already started."
    return
  fi

  local net; net="$(state_get network)"
  local mf; mf="$(state_get manifest_file)"
  local vault_addr; vault_addr="$(manifest_addr devReserveVestingVault)"

  echo ""
  warn "This sets the 60-month vesting start time. It is a ONE-TIME irreversible operation."
  info "The 60-day cliff begins from the timestamp you choose."
  echo ""
  bold "Choose start time:"
  echo "  1) Now (current block timestamp)"
  echo "  2) Enter a custom Unix timestamp"
  ask "Your choice" "1" _ts_choice
  case "$_ts_choice" in
    2)
      ask "Unix timestamp in seconds (e.g. 1748000000)" "" VESTING_START_TIMESTAMP
      ;;
    *)
      VESTING_START_TIMESTAMP=""
      ;;
  esac

  echo ""
  ask "Confirm: start vesting now? (Y/n)" "Y" _go
  case "$_go" in [Nn]) info "Aborted."; return ;; esac

  (cd "$REPO_ROOT" && \
    DEV_VAULT="$vault_addr" \
    VESTING_START_TIMESTAMP="$VESTING_START_TIMESTAMP" \
    npx hardhat run contracts/scripts/start-vesting.ts --network "$net"
  )

  state_set vesting_done "true"
  ok "Vesting schedule started!"
}

run_step4_handover() {
  banner "Step 4 — Arm Governance Handover"

  local deployed_at; deployed_at="$(state_get deployed_at)"
  if [ -z "$deployed_at" ]; then
    err "No deployment found. Run Step 1 first."
    return 1
  fi

  local handover_done; handover_done="$(state_get handover_done)"
  if [ "$handover_done" = "true" ]; then
    ok "Handover already armed."
    return
  fi

  local net; net="$(state_get network)"
  local handover_addr; handover_addr="$(manifest_addr systemHandover)"

  echo ""
  warn "This starts the governance-handover countdown. It is IRREVERSIBLE."
  warn "Only proceed once you have replaced the DAO/timelock/council placeholder"
  warn "slots in SystemHandover with real governance contracts."
  echo ""
  ask "Have you updated the governance slots? (y/N)" "N" _ready
  case "$_ready" in [Yy]) ;; *)
    info "Aborting — please update governance contracts first."
    info "See: https://github.com/Scorpio861104/Vfide for instructions."
    return
  ;; esac

  bold "Choose launch timestamp:"
  echo "  1) Now"
  echo "  2) Custom Unix timestamp"
  ask "Your choice" "1" _ts_choice
  case "$_ts_choice" in
    2) ask "Unix timestamp" "" HANDOVER_START_TIMESTAMP ;;
    *) HANDOVER_START_TIMESTAMP="" ;;
  esac

  ask "Confirm: arm handover countdown? (Y/n)" "Y" _go
  case "$_go" in [Nn]) info "Aborted."; return ;; esac

  (cd "$REPO_ROOT" && \
    SYSTEM_HANDOVER="$handover_addr" \
    HANDOVER_START_TIMESTAMP="$HANDOVER_START_TIMESTAMP" \
    npx hardhat run contracts/scripts/arm-handover.ts --network "$net"
  )

  state_set handover_done "true"
  ok "Handover armed!"
}

show_addresses() {
  banner "Deployed Contract Addresses"
  local mf; mf="$(state_get manifest_file)"
  if [ -z "$mf" ] || [ ! -f "${REPO_ROOT}/${mf}" ]; then
    err "No deployment manifest found. Deploy first (Step 1)."
    return
  fi
  echo ""
  node -e "
    const m = JSON.parse(require('fs').readFileSync('${REPO_ROOT}/${mf}','utf8'));
    const a = m.addresses;
    const pad = (s,n) => s.padEnd(n,' ');
    Object.entries(a).forEach(([k,v]) => {
      if (v && v !== 'null') console.log('  ' + pad(k+':',30) + v);
      else console.log('  ' + pad(k+':',30) + '(not deployed)');
    });
  " 2>/dev/null
  echo ""
  info "Manifest file: ${mf}"
}

reset_state() {
  banner "Reset State"
  warn "This clears the wizard's memory of any current deployment."
  warn "It does NOT undo anything on-chain."
  ask "Are you sure? (y/N)" "N" _confirm
  case "$_confirm" in
    [Yy])
      rm -f "$STATE_FILE"
      ok "State cleared. The wizard will start fresh."
      ;;
    *) info "Cancelled." ;;
  esac
}

# ── Main menu ─────────────────────────────────────────────────────────────────

main_menu() {
  while true; do
    print_status

    echo -e "${BOLD}What would you like to do?${RESET}"
    echo "  1)  Step 1 — Deploy all contracts"
    echo "  2)  Step 2 — Apply wiring  (run after 48h)"
    echo "  3)  Step 3 — Start vesting (one-time)"
    echo "  4)  Step 4 — Arm handover  (one-time, irreversible)"
    echo "  5)  Show contract addresses"
    echo "  6)  Reset wizard state  (does not affect on-chain contracts)"
    echo "  0)  Exit"
    echo ""
    ask "Choice" "" _choice

    case "$_choice" in
      1) run_step1_deploy  ;;
      2) run_step2_wiring  ;;
      3) run_step3_vesting ;;
      4) run_step4_handover ;;
      5) show_addresses    ;;
      6) reset_state       ;;
      0|q|quit|exit) echo ""; ok "Goodbye!"; echo ""; exit 0 ;;
      *) warn "Unknown choice: $_choice" ;;
    esac

    echo ""
    ask "Press Enter to return to the menu" "" _dummy
  done
}

# ── Entrypoint ────────────────────────────────────────────────────────────────

cd "$REPO_ROOT"
require_deps

clear 2>/dev/null || true
echo ""
echo -e "${BOLD}${CYAN}"
echo "  ██╗   ██╗███████╗██╗██████╗ ███████╗"
echo "  ██║   ██║██╔════╝██║██╔══██╗██╔════╝"
echo "  ██║   ██║█████╗  ██║██║  ██║█████╗  "
echo "  ╚██╗ ██╔╝██╔══╝  ██║██║  ██║██╔══╝  "
echo "   ╚████╔╝ ██║     ██║██████╔╝███████╗"
echo "    ╚═══╝  ╚═╝     ╚═╝╚═════╝ ╚══════╝"
echo -e "${RESET}"
echo -e "  ${BOLD}Deployment Wizard${RESET}  —  the only script you need"
echo ""

main_menu
