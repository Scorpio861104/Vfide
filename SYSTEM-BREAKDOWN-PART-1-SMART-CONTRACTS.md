# VFIDE System Breakdown - Part 1: Smart Contracts
**Complete Technical Reference**  
**Date:** January 10, 2026  
**Part:** 1 of 4

---

## Table of Contents
1. [Overview](#overview)
2. [Core Contracts](#core-contracts)
3. [Service Layer](#service-layer)
4. [Application Layer](#application-layer)
5. [Complete Function Reference](#complete-function-reference)
6. [Events & Errors](#events--errors)
7. [Security Features](#security-features)

---

## Overview

### Contract Statistics
- **Total Contracts:** 48 Solidity files
- **Total Lines:** 23,749 lines of code
- **Compiler Version:** Solidity 0.8.30
- **Base Framework:** OpenZeppelin 5.4.0
- **Deployment Networks:** Base, Polygon, zkSync Era

### Architecture Layers
```
┌─────────────────────────────────────────┐
│         APPLICATION LAYER               │
│  CouncilElection, BadgeManager,         │
│  PayrollManager, SubscriptionManager    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          SERVICE LAYER                  │
│  MerchantPortal, EscrowManager,         │
│  DAO, ProofScoreBurnRouter              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           CORE LAYER                    │
│  VFIDEToken, VFIDETrust,                │
│  VaultInfrastructure                    │
└─────────────────────────────────────────┘
```

---

## Core Contracts

### 1. VFIDEToken.sol
**Purpose:** ERC20 token with vault-only transfer enforcement  
**Lines:** 924 lines  
**File:** `contracts/VFIDEToken.sol`

#### Contract Features
- ✅ ERC20 compliant with 18 decimals
- ✅ Vault-only transfer enforcement (default ON)
- ✅ ProofScore-aware fee routing
- ✅ Circuit breaker emergency bypass
- ✅ Blacklist & freeze functionality
- ✅ Anti-whale protection (configurable)
- ✅ EIP-2612 permit support
- ✅ Multi-chain compatible (zkSync ready)

#### Supply Distribution
```solidity
Total Supply:       200,000,000 VFIDE (18 decimals)
├── Dev Reserve:    50,000,000 VFIDE (25%) → DevReserveVestingVault
├── Presale:        50,000,000 VFIDE (25%) → VFIDEPresale contract
└── Treasury:       100,000,000 VFIDE (50%) → Treasury operations
```

#### State Variables
```solidity
// Constants
string public constant name = "VFIDE Token";
string public constant symbol = "VFIDE";
uint8 public constant decimals = 18;
uint256 public constant MAX_SUPPLY = 200_000_000e18;
uint256 public constant DEV_RESERVE_SUPPLY = 50_000_000e18;
uint256 public constant PRESALE_CAP = 50_000_000e18;

// Anti-Whale Protection (configurable)
uint256 public maxTransferAmount = 2_000_000e18;      // 1% of supply
uint256 public maxWalletBalance = 4_000_000e18;       // 2% of supply
uint256 public dailyTransferLimit = 5_000_000e18;     // 2.5% of supply
uint256 public transferCooldown = 0;                   // Seconds between transfers

// Tracking
mapping(address => uint256) public dailyTransferred;
mapping(address => uint256) public dailyResetTime;
mapping(address => uint256) public lastTransferTime;
mapping(address => bool) public whaleLimitExempt;

// ERC20 Storage
uint256 public totalSupply;
mapping(address => uint256) private _balances;
mapping(address => mapping(address => uint256)) private _allowances;

// Module References
IVaultHub public vaultHub;                    // Vault registry (required)
ISecurityHub public securityHub;              // Lock checks (optional)
IProofLedger public ledger;                   // Event logging (optional)
IProofScoreBurnRouterToken public burnRouter; // Fee calculator (optional)

// Policy Settings
bool public vaultOnly = true;                 // VAULT-ONLY ON BY DEFAULT
bool public policyLocked = false;             // Once locked, permanent
bool public circuitBreaker = false;           // Emergency bypass
uint256 public circuitBreakerExpiry = 0;      // Auto-disable timestamp
uint256 public constant MAX_CIRCUIT_BREAKER_DURATION = 7 days;

// Exemptions
mapping(address => bool) public systemExempt; // Bypass all checks
mapping(address => bool) public whitelisted;  // Bypass vault-only

// Presale & Sinks
address public presaleContract;
address public treasurySink;
address public sanctumSink;

// Sanctions & Compliance
mapping(address => bool) public isBlacklisted;
mapping(address => bool) public isFrozen;
mapping(address => uint64) public freezeTime;
uint64 public constant FREEZE_DELAY = 1 hours;
```

#### Public Functions

##### Transfer & Allowance
```solidity
function transfer(address to, uint256 amount) 
    external 
    nonReentrant 
    returns (bool)

function transferFrom(address from, address to, uint256 amount) 
    external 
    nonReentrant 
    returns (bool)

function approve(address spender, uint256 amount) 
    external 
    returns (bool)

function increaseAllowance(address spender, uint256 addedValue) 
    external 
    returns (bool)

function decreaseAllowance(address spender, uint256 subtractedValue) 
    external 
    returns (bool)
```

##### View Functions
```solidity
function balanceOf(address account) external view returns (uint256)
function allowance(address owner, address spender) external view returns (uint256)
function isVault(address addr) external view returns (bool)
function isExempt(address addr) public view returns (bool)
```

##### Admin Functions (Owner Only)
```solidity
// Module Configuration
function setVaultHub(address newHub) external onlyOwner
function setSecurityHub(address newHub) external onlyOwner
function setLedger(address newLedger) external onlyOwner
function setBurnRouter(address newRouter) external onlyOwner

// Sink Configuration
function setTreasurySink(address newSink) external onlyOwner
function setSanctumSink(address newSink) external onlyOwner

// Policy Management
function setVaultOnly(bool enabled) external onlyOwner
function lockPolicy() external onlyOwner
function setCircuitBreaker(bool enabled, uint256 durationSeconds) external onlyOwner

// Exemption Management
function setSystemExempt(address addr, bool exempt) external onlyOwner
function setWhitelisted(address addr, bool wl) external onlyOwner

// Anti-Whale Configuration
function setAntiWhaleParams(
    uint256 _maxTransferAmount,
    uint256 _maxWalletBalance,
    uint256 _dailyTransferLimit,
    uint256 _transferCooldown
) external onlyOwner

function setWhaleLimitExempt(address addr, bool exempt) external onlyOwner

// Compliance
function freezeAddress(address user) external onlyOwner
function unfreezeAddress(address user) external onlyOwner
function setBlacklist(address user, bool blacklisted) external onlyOwner

// Emergency
function rescueTokens(address tokenAddress, uint256 amount) external onlyOwner
```

##### EIP-2612 Permit
```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external

function nonces(address owner) external view returns (uint256)
function DOMAIN_SEPARATOR() external view returns (bytes32)
```

#### Internal Functions
```solidity
function _transfer(address from, address to, uint256 amount) internal
function _checkAntiWhale(address from, address to, uint256 amount) internal
function _processTransferFees(
    address from,
    address to,
    uint256 amount
) internal returns (uint256 netAmount)
function _mint(address account, uint256 amount) internal
function _burn(address account, uint256 amount) internal
function _approve(address owner, address spender, uint256 amount) internal
function _spendAllowance(address owner, address spender, uint256 amount) internal
```

#### Events
```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
event VaultHubSet(address indexed hub);
event SecurityHubSet(address indexed hub);
event LedgerSet(address indexed ledger);
event BurnRouterSet(address indexed router);
event TreasurySinkSet(address indexed sink);
event SanctumSinkSet(address indexed sink);
event VaultOnlySet(bool enabled);
event PolicyLocked();
event CircuitBreakerSet(bool enabled, uint256 expiry);
event SystemExemptSet(address indexed addr, bool exempt);
event WhitelistedSet(address indexed addr, bool whitelisted);
event AntiWhaleSet(uint256 maxTransfer, uint256 maxWallet, uint256 dailyLimit, uint256 cooldown);
event WhaleLimitExemptSet(address indexed addr, bool exempt);
event BlacklistSet(address indexed user, bool status, address indexed setBy);
event FrozenSet(address indexed user, bool frozen, address indexed setBy);
event TokensRescued(address indexed token, uint256 amount);
```

#### Security Features
1. **Vault-Only Enforcement:** Users must use vaults for transfers (enables recovery)
2. **Circuit Breaker:** Emergency bypass with time limit (max 7 days)
3. **Freeze-Before-Blacklist:** 1-hour delay prevents front-running
4. **Anti-Whale Protection:** Configurable limits on transfers, balances, daily volume
5. **Reentrancy Protection:** NonReentrant modifier on transfers
6. **Policy Lock:** Makes vault-only permanent once enabled
7. **Audit Trail:** Enhanced events with caller addresses

---

### 2. VFIDETrust.sol (Seer)
**Purpose:** On-chain reputation and ProofScore system  
**Lines:** 631 lines  
**File:** `contracts/VFIDETrust.sol`

#### Contract Features
- ✅ ProofScore calculation (0-10000 scale, 10x precision for 0-100%)
- ✅ 6-factor reputation system
- ✅ Endorsement mechanism with fatigue
- ✅ Score decay for inactivity
- ✅ Badge system integration
- ✅ Anti-gaming protections
- ✅ Dispute resolution

#### ProofScore Factors (6 Components)
```solidity
1. Capital Factor (40% weight)
   - VFIDE balance
   - Vault deposits
   - Staking amount

2. Behavior Factor (25% weight)
   - Transaction success rate
   - Dispute history
   - Payment reliability

3. Social Factor (15% weight)
   - Endorsements received
   - Endorsement quality (endorser's score)
   - Social interactions

4. Credentials Factor (10% weight)
   - Verified identity
   - KYC status (optional)
   - Badge achievements

5. Activity Factor (5% weight)
   - Transaction frequency
   - Engagement level
   - Platform usage

6. Fixed Baseline (5% weight)
   - Minimum score (500 points)
   - Prevents zero scores
```

#### State Variables
```solidity
// ProofScore Storage
mapping(address => uint256) public proofScore;        // 0-10000 (0-100%)
mapping(address => uint256) public lastUpdate;
mapping(address => uint256) public lastActivity;

// Factor Breakdown
mapping(address => uint256) public capitalScore;      // VFIDE holdings
mapping(address => uint256) public behaviorScore;     // Transaction history
mapping(address => uint256) public socialScore;       // Endorsements
mapping(address => uint256) public credentialsScore;  // Badges, KYC
mapping(address => uint256) public activityScore;     // Platform usage

// Endorsement System
struct Endorsement {
    address endorser;
    uint256 weight;          // Based on endorser's ProofScore
    uint256 timestamp;
    string message;
    bool active;
}

mapping(address => Endorsement[]) public endorsements;
mapping(address => mapping(address => uint256)) public endorsementIndex;
mapping(address => uint256) public endorsementCount;
mapping(address => uint256) public lastEndorsementGiven;
mapping(address => uint256) public endorsementsGivenCount;

// Endorsement Fatigue (prevents spam)
uint256 public constant ENDORSEMENT_COOLDOWN = 1 days;
uint256 public constant MAX_ENDORSEMENTS_PER_DAY = 10;
uint256 public constant ENDORSEMENT_FATIGUE_PENALTY = 50; // 0.5% per extra endorsement

// Decay Settings
uint256 public constant DECAY_PERIOD = 30 days;
uint256 public constant DECAY_RATE = 100; // 1% per period
uint256 public constant MIN_SCORE = 500;  // Minimum baseline (5%)

// Badge Registry
mapping(address => mapping(uint256 => bool)) public hasBadge;
mapping(address => uint256) public badgeCount;

// Dispute System
struct Dispute {
    address challenger;
    address challenged;
    string reason;
    uint256 stake;           // VFIDE staked by challenger
    uint256 timestamp;
    bool resolved;
    bool upheld;
}

mapping(uint256 => Dispute) public disputes;
uint256 public disputeCount;
mapping(address => uint256[]) public userDisputes;
mapping(address => uint256) public disputeStrike;

// Module References
IVaultHub public vaultHub;
IVFIDEToken public token;
IBadgeManager public badgeManager;
```

#### Public Functions

##### ProofScore Management
```solidity
function calculateProofScore(address user) public returns (uint256)
function updateProofScore(address user) external returns (uint256)
function getProofScore(address user) external view returns (uint256)
function getScoreBreakdown(address user) external view returns (
    uint256 capital,
    uint256 behavior,
    uint256 social,
    uint256 credentials,
    uint256 activity,
    uint256 total
)
```

##### Endorsement Functions
```solidity
function giveEndorsement(address recipient, string calldata message) external
function removeEndorsement(address recipient) external
function getEndorsements(address user) external view returns (Endorsement[] memory)
function getEndorsementCount(address user) external view returns (uint256)
function canGiveEndorsement(address endorser) external view returns (bool)
```

##### Badge Functions
```solidity
function awardBadge(address user, uint256 badgeId) external
function revokeBadge(address user, uint256 badgeId) external
function hasBadgeActive(address user, uint256 badgeId) external view returns (bool)
function getBadgeCount(address user) external view returns (uint256)
```

##### Dispute Functions
```solidity
function raiseDispute(
    address challenged,
    string calldata reason,
    uint256 stakeAmount
) external returns (uint256 disputeId)

function resolveDispute(
    uint256 disputeId,
    bool upheld,
    uint256 penaltyAmount
) external onlyOwner

function getDisputeHistory(address user) external view returns (uint256[] memory)
function getDisputeStrikeCount(address user) external view returns (uint256)
```

##### Admin Functions
```solidity
function setVaultHub(address hub) external onlyOwner
function setToken(address token) external onlyOwner
function setBadgeManager(address manager) external onlyOwner
function setDecayParams(uint256 period, uint256 rate) external onlyOwner
function setEndorsementParams(
    uint256 cooldown,
    uint256 maxPerDay,
    uint256 fatiguePenalty
) external onlyOwner
function emergencyResetScore(address user, uint256 newScore) external onlyOwner
```

#### Internal Functions
```solidity
function _calculateCapitalScore(address user) internal view returns (uint256)
function _calculateBehaviorScore(address user) internal view returns (uint256)
function _calculateSocialScore(address user) internal view returns (uint256)
function _calculateCredentialsScore(address user) internal view returns (uint256)
function _calculateActivityScore(address user) internal view returns (uint256)
function _applyDecay(address user, uint256 score) internal view returns (uint256)
function _validateEndorsement(address endorser, address recipient) internal view
function _calculateEndorsementWeight(address endorser) internal view returns (uint256)
```

#### Events
```solidity
event ProofScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore);
event EndorsementGiven(address indexed endorser, address indexed recipient, uint256 weight);
event EndorsementRemoved(address indexed endorser, address indexed recipient);
event BadgeAwarded(address indexed user, uint256 indexed badgeId);
event BadgeRevoked(address indexed user, uint256 indexed badgeId);
event DisputeRaised(uint256 indexed disputeId, address indexed challenger, address indexed challenged);
event DisputeResolved(uint256 indexed disputeId, bool upheld, uint256 penalty);
event ScoreDecayed(address indexed user, uint256 amount);
event EmergencyScoreReset(address indexed user, uint256 newScore, address indexed admin);
```

---

### 3. VaultInfrastructure.sol
**Purpose:** Personal smart contract vaults with guardian recovery  
**Lines:** 486 lines  
**File:** `contracts/VaultInfrastructure.sol`

#### Contract Features
- ✅ Deterministic vault deployment (CREATE2)
- ✅ 2-of-3 guardian recovery system
- ✅ Time-locked transfers
- ✅ Emergency freeze mechanism
- ✅ Inheritance planning
- ✅ Multi-signature operations
- ✅ Allowance system for recurring payments

#### Architecture
```
VaultHub (Factory)
    │
    ├── Creates UserVault via CREATE2
    │   ├── Owner: User's EOA
    │   ├── Guardians: 3 trusted addresses
    │   └── Recovery: 2-of-3 multisig
    │
    └── Registry of all vaults
```

#### UserVault Contract
```solidity
contract UserVault {
    // Core State
    address public owner;
    address public vaultHub;
    address[] public guardians;        // Up to 3 guardians
    uint256 public guardianThreshold;  // Typically 2
    
    // Security State
    bool public locked;
    uint256 public lockExpiry;
    bool public emergencyFreeze;
    address public freezeInitiator;
    
    // Recovery State
    bool public recoveryMode;
    address public recoveryAddress;
    uint256 public recoveryInitiatedAt;
    uint256 public constant RECOVERY_DELAY = 3 days;
    mapping(address => bool) public recoveryApprovals;
    
    // Transfer Controls
    struct PendingTransfer {
        address token;
        address to;
        uint256 amount;
        uint256 executeAfter;
        bool executed;
        bool cancelled;
    }
    mapping(uint256 => PendingTransfer) public pendingTransfers;
    uint256 public transferCount;
    uint256 public timeLockDuration = 24 hours;
    
    // Allowances (for recurring payments)
    struct Allowance {
        uint256 amount;
        uint256 period;        // Seconds
        uint256 lastUsed;
        uint256 remaining;
    }
    mapping(address => mapping(address => Allowance)) public allowances;
    
    // Inheritance
    address public inheritanceRecipient;
    uint256 public inactivityPeriod = 365 days;
    uint256 public lastActivity;
}
```

#### VaultHub Functions
```solidity
// Vault Creation
function createVault(
    address[] calldata guardians,
    uint256 guardianThreshold
) external returns (address vaultAddress)

function predictVaultAddress(address owner) external view returns (address)

// Registry
function getVaultByOwner(address owner) external view returns (address)
function isVault(address addr) external view returns (bool)
function getAllVaults() external view returns (address[] memory)
function getVaultCount() external view returns (uint256)

// Admin
function setVaultImplementation(address implementation) external onlyOwner
function pauseVaultCreation() external onlyOwner
function unpauseVaultCreation() external onlyOwner
```

#### UserVault Functions
```solidity
// Owner Functions
function transfer(
    address token,
    address to,
    uint256 amount,
    bool useTimeLock
) external onlyOwner returns (uint256 transferId)

function cancelTransfer(uint256 transferId) external onlyOwner
function executeTransfer(uint256 transferId) external
function setTimeLockDuration(uint256 duration) external onlyOwner

// Guardian Management
function addGuardian(address guardian) external onlyOwner
function removeGuardian(address guardian) external onlyOwner
function replaceGuardian(address oldGuardian, address newGuardian) external onlyOwner
function setGuardianThreshold(uint256 threshold) external onlyOwner

// Recovery
function initiateRecovery(address newOwner) external onlyGuardian
function approveRecovery() external onlyGuardian
function executeRecovery() external
function cancelRecovery() external onlyOwner

// Emergency
function emergencyFreeze() external onlyGuardian
function unfreeze() external onlyOwner
function emergencyWithdraw(address token, uint256 amount) external onlyGuardian

// Allowances
function setAllowance(
    address token,
    address spender,
    uint256 amount,
    uint256 period
) external onlyOwner

function spend(
    address token,
    address from,
    uint256 amount
) external

function getAllowance(address token, address spender) external view returns (Allowance memory)

// Inheritance
function setInheritanceRecipient(address recipient) external onlyOwner
function setInactivityPeriod(uint256 period) external onlyOwner
function claimInheritance() external
function resetActivity() external onlyOwner

// View Functions
function getGuardians() external view returns (address[] memory)
function isGuardian(address addr) external view returns (bool)
function getPendingTransfer(uint256 transferId) external view returns (PendingTransfer memory)
function getRecoveryStatus() external view returns (
    bool inRecovery,
    address proposedOwner,
    uint256 approvalCount,
    uint256 threshold
)
```

#### Events
```solidity
event VaultCreated(address indexed owner, address indexed vault, address[] guardians);
event TransferInitiated(uint256 indexed transferId, address token, address to, uint256 amount);
event TransferExecuted(uint256 indexed transferId);
event TransferCancelled(uint256 indexed transferId);
event GuardianAdded(address indexed guardian);
event GuardianRemoved(address indexed guardian);
event RecoveryInitiated(address indexed newOwner, address indexed initiator);
event RecoveryApproved(address indexed guardian);
event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
event RecoveryCancelled();
event EmergencyFreezeActivated(address indexed initiator);
event VaultUnfrozen();
event AllowanceSet(address indexed token, address indexed spender, uint256 amount);
event AllowanceUsed(address indexed token, address indexed spender, uint256 amount);
event InheritanceRecipientSet(address indexed recipient);
event InheritanceClaimed(address indexed recipient, address indexed previousOwner);
```

---

## Service Layer

### 4. MerchantPortal.sol
**Purpose:** Commerce layer with 0% merchant fees  
**Lines:** 562 lines  
**File:** `contracts/MerchantPortal.sol`

#### Features
- ✅ Merchant registration with ProofScore threshold
- ✅ Payment processing with 0% fees
- ✅ Escrow protection
- ✅ Dispute resolution
- ✅ Merchant analytics
- ✅ Rebate system

#### State Variables
```solidity
// Merchant Registry
struct Merchant {
    address merchantAddress;
    string businessName;
    string category;
    uint256 proofScore;
    uint256 registeredAt;
    uint256 totalSales;
    uint256 totalTransactions;
    uint256 disputeCount;
    uint256 resolvedDisputes;
    bool active;
    bool verified;
}

mapping(address => Merchant) public merchants;
address[] public merchantList;
uint256 public merchantCount;

// Payment Records
struct Payment {
    uint256 paymentId;
    address merchant;
    address customer;
    uint256 amount;
    uint256 timestamp;
    string description;
    bool completed;
    bool disputed;
}

mapping(uint256 => Payment) public payments;
uint256 public paymentCount;
mapping(address => uint256[]) public merchantPayments;
mapping(address => uint256[]) public customerPayments;

// Escrow
mapping(uint256 => bool) public inEscrow;
mapping(uint256 => uint256) public escrowReleaseTime;
uint256 public constant DEFAULT_ESCROW_PERIOD = 7 days;

// Dispute System
struct Dispute {
    uint256 paymentId;
    address initiator;
    string reason;
    uint256 timestamp;
    bool resolved;
    DisputeOutcome outcome;
}

enum DisputeOutcome { Pending, MerchantWins, CustomerWins, Split }

mapping(uint256 => Dispute) public disputes;
uint256 public disputeCount;

// Configuration
uint256 public minProofScoreForMerchant = 6000; // 60%
uint256 public merchantFee = 0; // 0% merchant fees
uint256 public escrowPeriod = 7 days;

// Module References
IVFIDETrust public trust;
IVFIDEToken public token;
```

#### Functions
```solidity
// Merchant Management
function registerMerchant(
    string calldata businessName,
    string calldata category
) external returns (bool)

function updateMerchantInfo(
    string calldata businessName,
    string calldata category
) external

function deactivateMerchant() external
function reactivateMerchant() external
function verifyMerchant(address merchant) external onlyOwner
function unverifyMerchant(address merchant) external onlyOwner

// Payment Processing
function processPayment(
    address merchant,
    uint256 amount,
    string calldata description,
    bool useEscrow
) external returns (uint256 paymentId)

function releaseEscrow(uint256 paymentId) external
function refundPayment(uint256 paymentId) external onlyOwner

// Disputes
function raiseDispute(uint256 paymentId, string calldata reason) external
function resolveDispute(
    uint256 paymentId,
    DisputeOutcome outcome,
    uint256 refundAmount
) external onlyOwner

// Analytics
function getMerchantStats(address merchant) external view returns (
    uint256 totalSales,
    uint256 totalTransactions,
    uint256 averageTransaction,
    uint256 disputeRate,
    bool active,
    bool verified
)

function getTopMerchants(uint256 count) external view returns (address[] memory)
function getPaymentHistory(address user, bool isMerchant) external view returns (uint256[] memory)

// Admin
function setMinProofScore(uint256 score) external onlyOwner
function setEscrowPeriod(uint256 period) external onlyOwner
function setTrust(address trust) external onlyOwner
function setToken(address token) external onlyOwner
```

#### Events
```solidity
event MerchantRegistered(address indexed merchant, string businessName);
event MerchantVerified(address indexed merchant);
event MerchantDeactivated(address indexed merchant);
event PaymentProcessed(uint256 indexed paymentId, address merchant, address customer, uint256 amount);
event EscrowReleased(uint256 indexed paymentId);
event PaymentRefunded(uint256 indexed paymentId, uint256 amount);
event DisputeRaised(uint256 indexed paymentId, address indexed initiator);
event DisputeResolved(uint256 indexed paymentId, DisputeOutcome outcome);
```

---

### 5. DAO.sol
**Purpose:** Score-weighted governance system  
**Lines:** 187 lines  
**File:** `contracts/DAO.sol`

#### Features
- ✅ ProofScore-weighted voting power
- ✅ Multiple proposal types (Generic, Financial, Protocol, Security)
- ✅ Quorum requirements
- ✅ Timelock protection (3 days)
- ✅ Vote delegation
- ✅ Fatigue system (prevents spam voting)

#### State Variables
```solidity
// Proposal Structure
struct Proposal {
    uint256 proposalId;
    address proposer;
    ProposalType proposalType;
    string title;
    string description;
    uint256 startBlock;
    uint256 endBlock;
    uint256 forVotes;
    uint256 againstVotes;
    uint256 abstainVotes;
    bool executed;
    bool cancelled;
    mapping(address => Receipt) receipts;
}

enum ProposalType { Generic, Financial, Protocol, Security }

struct Receipt {
    bool hasVoted;
    uint8 support; // 0 = against, 1 = for, 2 = abstain
    uint256 votes;
}

mapping(uint256 => Proposal) public proposals;
uint256 public proposalCount;

// Voting Configuration
uint256 public votingDelay = 1 days;
uint256 public votingPeriod = 7 days;
uint256 public quorumVotes = 5000e18; // 5,000 VFIDE worth of voting power
uint256 public proposalThreshold = 100e18; // 100 VFIDE to propose

// Vote Delegation
mapping(address => address) public delegates;
mapping(address => uint256) public delegateVotingPower;

// Fatigue (spam prevention)
mapping(address => uint256) public lastVoteTime;
uint256 public votingFatiguePeriod = 1 hours;

// Module References
IVFIDEToken public token;
IVFIDETrust public trust;
IDAOTimelock public timelock;
```

#### Functions
```solidity
// Proposal Management
function propose(
    ProposalType proposalType,
    string calldata title,
    string calldata description
) external returns (uint256 proposalId)

function cancel(uint256 proposalId) external
function execute(uint256 proposalId) external

// Voting
function castVote(uint256 proposalId, uint8 support) external
function castVoteWithReason(
    uint256 proposalId,
    uint8 support,
    string calldata reason
) external

// Vote Delegation
function delegate(address delegatee) external
function undelegate() external
function getDelegateVotes(address account) external view returns (uint256)

// View Functions
function getProposalState(uint256 proposalId) external view returns (ProposalState)
function getVotingPower(address account) external view returns (uint256)
function getReceipt(uint256 proposalId, address voter) external view returns (Receipt memory)
function getProposalVotes(uint256 proposalId) external view returns (
    uint256 forVotes,
    uint256 againstVotes,
    uint256 abstainVotes
)

// Admin
function setVotingDelay(uint256 delay) external onlyOwner
function setVotingPeriod(uint256 period) external onlyOwner
function setQuorumVotes(uint256 votes) external onlyOwner
function setProposalThreshold(uint256 threshold) external onlyOwner
function setTimelock(address timelock) external onlyOwner
```

#### Voting Power Calculation
```solidity
// Voting Power = Token Balance × (ProofScore / 1000)
// Example: 1000 VFIDE × (8000 / 1000) = 8000 voting power
// High trust users get amplified voting power
function getVotingPower(address account) public view returns (uint256) {
    uint256 tokenBalance = token.balanceOf(account);
    uint256 proofScore = trust.getProofScore(account);
    
    // ProofScore is 0-10000 (0-100%), divide by 1000 for multiplier
    uint256 multiplier = proofScore / 1000;
    if (multiplier == 0) multiplier = 1; // Minimum 1x
    
    return tokenBalance * multiplier;
}
```

#### Events
```solidity
event ProposalCreated(
    uint256 indexed proposalId,
    address indexed proposer,
    ProposalType proposalType,
    string title
);
event VoteCast(
    address indexed voter,
    uint256 indexed proposalId,
    uint8 support,
    uint256 votes
);
event ProposalExecuted(uint256 indexed proposalId);
event ProposalCancelled(uint256 indexed proposalId);
event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
```

---

### 6. ProofScoreBurnRouter.sol
**Purpose:** Dynamic fee calculation and token burning  
**Lines:** 579 lines  
**File:** `contracts/ProofScoreBurnRouter.sol`

#### Features
- ✅ Dynamic fees based on ProofScore (0.25% - 5%)
- ✅ Multi-destination fee routing
- ✅ Deflationary burn mechanism
- ✅ Charity allocation (sanctum)
- ✅ Ecosystem vault funding
- ✅ Supply floor protection
- ✅ Daily burn caps

#### Fee Structure
```
ProofScore Range → Fee Rate
├── 9500-10000 (95-100%): 0.25% (trusted elite)
├── 9000-9499  (90-94%):  0.50%
├── 8500-8999  (85-89%):  1.00%
├── 8000-8499  (80-84%):  1.50%
├── 7000-7999  (70-79%):  2.00%
├── 6000-6999  (60-69%):  2.50%
├── 5000-5999  (50-59%):  3.00%
├── 4000-4999  (40-49%):  3.50%
├── 3000-3999  (30-39%):  4.00%
├── 2000-2999  (20-29%):  4.50%
└── 0-1999     (0-19%):   5.00% (maximum penalty)

Fee Distribution:
├── 40% → Burn (deflationary)
├── 10% → Sanctum (charity)
└── 50% → Ecosystem Vault
    ├── 33.3% → Council salaries
    ├── 33.3% → Merchant bonuses
    └── 33.3% → Headhunter/Gamification
```

#### State Variables
```solidity
// Fee Configuration
uint256 public constant BASE_FEE = 100; // 1% base
uint256 public constant HIGH_TRUST_DISCOUNT = 75; // -0.75%
uint256 public constant LOW_TRUST_PENALTY = 400; // +4%
uint256 public constant MIN_FEE = 25; // 0.25%
uint256 public constant MAX_FEE = 500; // 5%

// ProofScore Thresholds
uint256 public constant HIGH_TRUST_THRESHOLD = 8000; // 80%
uint256 public constant LOW_TRUST_THRESHOLD = 4000; // 40%

// Fee Split Ratios (basis points, 10000 = 100%)
uint256 public burnPercentage = 4000;     // 40%
uint256 public sanctumPercentage = 1000;  // 10%
uint256 public ecosystemPercentage = 5000; // 50%

// Supply Protection
uint256 public supplyFloor = 50_000_000e18; // 50M VFIDE minimum
bool public floorReached = false;

// Daily Burn Caps
uint256 public dailyBurnCap = 100_000e18; // 100K VFIDE per day
uint256 public currentDayBurned;
uint256 public lastBurnResetTime;

// Destination Addresses
address public burnAddress = address(0);
address public sanctumAddress;
address public ecosystemVault;

// Statistics
uint256 public totalBurned;
uint256 public totalToSanctum;
uint256 public totalToEcosystem;

// Module References
IVFIDETrust public trust;
IVFIDEToken public token;
```

#### Functions
```solidity
// Fee Calculation
function calculateFee(address user, uint256 amount) external view returns (
    uint256 totalFee,
    uint256 burnAmount,
    uint256 sanctumAmount,
    uint256 ecosystemAmount
)

function getFeeRate(address user) external view returns (uint256)
function getEffectiveFeeRate(uint256 proofScore) public pure returns (uint256)

// Fee Processing
function processFees(
    address from,
    address to,
    uint256 amount
) external returns (uint256 netAmount, uint256 totalFees)

function distributeFees(uint256 totalFees) internal

// Burn Management
function burn(uint256 amount) internal
function checkBurnCap(uint256 amount) internal view returns (uint256 allowedBurn)
function resetDailyBurnIfNeeded() internal

// Configuration
function setBurnPercentage(uint256 percentage) external onlyOwner
function setSanctumPercentage(uint256 percentage) external onlyOwner
function setEcosystemPercentage(uint256 percentage) external onlyOwner
function setSanctumAddress(address addr) external onlyOwner
function setEcosystemVault(address addr) external onlyOwner
function setSupplyFloor(uint256 floor) external onlyOwner
function setDailyBurnCap(uint256 cap) external onlyOwner

// View Functions
function getTotalBurned() external view returns (uint256)
function getTotalToSanctum() external view returns (uint256)
function getTotalToEcosystem() external view returns (uint256)
function getRemainingDailyBurnCapacity() external view returns (uint256)
function isSupplyFloorReached() external view returns (bool)
```

#### Fee Calculation Logic
```solidity
function getEffectiveFeeRate(uint256 proofScore) public pure returns (uint256) {
    // ProofScore is 0-10000 (representing 0-100%)
    
    if (proofScore >= 9500) return 25;   // 0.25% (95%+)
    if (proofScore >= 9000) return 50;   // 0.50% (90-94%)
    if (proofScore >= 8500) return 100;  // 1.00% (85-89%)
    if (proofScore >= 8000) return 150;  // 1.50% (80-84%)
    if (proofScore >= 7000) return 200;  // 2.00% (70-79%)
    if (proofScore >= 6000) return 250;  // 2.50% (60-69%)
    if (proofScore >= 5000) return 300;  // 3.00% (50-59%)
    if (proofScore >= 4000) return 350;  // 3.50% (40-49%)
    if (proofScore >= 3000) return 400;  // 4.00% (30-39%)
    if (proofScore >= 2000) return 450;  // 4.50% (20-29%)
    
    return 500; // 5.00% (0-19%) maximum penalty
}
```

#### Events
```solidity
event FeesProcessed(
    address indexed from,
    address indexed to,
    uint256 amount,
    uint256 totalFees,
    uint256 burned,
    uint256 toSanctum,
    uint256 toEcosystem
);
event TokensBurned(uint256 amount, uint256 totalBurned);
event SupplyFloorReached(uint256 currentSupply, uint256 floor);
event DailyBurnCapReached(uint256 cap);
event FeeConfigUpdated(uint256 burnPct, uint256 sanctumPct, uint256 ecosystemPct);
event DestinationUpdated(address sanctum, address ecosystem);
```

---

## Application Layer

### 7. CouncilElection.sol
**Purpose:** Democratic council member election  
**Lines:** ~350 lines  
**File:** `contracts/CouncilElection.sol`

#### Features
- ✅ Score-weighted voting
- ✅ 1-12 council member elections
- ✅ Term limits and rotation
- ✅ Campaign period
- ✅ Automatic seat allocation
- ✅ Council salary distribution

### 8. BadgeManager.sol
**Purpose:** Achievement badges and NFTs  
**Lines:** ~400 lines  
**File:** `contracts/BadgeManager.sol`

#### Features
- ✅ 11 achievement badges
- ✅ NFT minting for badges
- ✅ Automatic eligibility checking
- ✅ Badge rarity tiers
- ✅ IPFS metadata storage

### 9. PayrollManager.sol
**Purpose:** Automated recurring payments  
**Lines:** ~350 lines  
**File:** `contracts/PayrollManager.sol`

#### Features
- ✅ Employee management
- ✅ Automated salary distribution
- ✅ Multiple payment schedules
- ✅ Bulk payment processing
- ✅ Payment history tracking

### 10. SubscriptionManager.sol
**Purpose:** Recurring subscription billing  
**Lines:** ~400 lines  
**File:** `contracts/SubscriptionManager.sol`

#### Features
- ✅ Subscription plans
- ✅ Automated billing cycles
- ✅ Grace periods
- ✅ Cancellation handling
- ✅ Refund support

---

## Security Features Summary

### 1. Access Control
- ✅ Ownable pattern (OpenZeppelin)
- ✅ Role-based permissions
- ✅ Multi-signature operations
- ✅ Timelock requirements

### 2. Reentrancy Protection
- ✅ ReentrancyGuard on all payable functions
- ✅ Checks-effects-interactions pattern
- ✅ Mutex locks where needed

### 3. Input Validation
- ✅ Address zero checks
- ✅ Amount validation
- ✅ Array bounds checking
- ✅ Overflow protection (Solidity 0.8+)

### 4. Emergency Controls
- ✅ Circuit breaker mechanisms
- ✅ Pause functionality
- ✅ Emergency withdrawals
- ✅ Guardian interventions

### 5. Economic Security
- ✅ Anti-whale limits
- ✅ Daily transfer caps
- ✅ Supply floor protection
- ✅ Burn rate limits

---

## Gas Optimization Patterns

1. **Packed Storage:** uint96 timestamps, uint16 counters
2. **Custom Errors:** Instead of revert strings
3. **Efficient Loops:** Minimal storage reads
4. **View Functions:** Off-chain computation
5. **Batch Operations:** Process multiple items at once

---

## Deployment Information

### Contract Addresses (Example - Base Sepolia)
```
VFIDEToken:              0x1234...
VFIDETrust:              0x2345...
VaultHub:                0x3456...
MerchantPortal:          0x4567...
DAO:                     0x5678...
ProofScoreBurnRouter:    0x6789...
```

### Deployment Order
1. VFIDEToken (core asset)
2. VFIDETrust (reputation)
3. VaultHub (custody)
4. ProofScoreBurnRouter (fees)
5. MerchantPortal (commerce)
6. DAO (governance)
7. Application contracts

---

## Testing Coverage

### Test Statistics
- **Total Tests:** 200+ contract tests
- **Coverage:** ~98%
- **Test Types:** Unit, Integration, Fork tests
- **Gas Benchmarks:** All functions profiled

### Critical Test Scenarios
1. ✅ Vault-only enforcement
2. ✅ ProofScore calculation accuracy
3. ✅ Guardian recovery flows
4. ✅ Fee calculation and distribution
5. ✅ Emergency scenarios
6. ✅ Upgrade procedures
7. ✅ Multi-chain compatibility

---

**END OF PART 1 - SMART CONTRACTS**

**Next:** Part 2 - Frontend Application  
**Total Parts:** 4  
**Document Status:** Complete and Downloadable
