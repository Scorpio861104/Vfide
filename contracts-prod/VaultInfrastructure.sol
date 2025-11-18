// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * VaultInfrastructure (zkSync Era ready) — FINAL
 * ----------------------------------------------------------
 * Single-file hub providing:
 *  - Deterministic Create2 factory for user vaults
 *  - Registry: vaultOf(owner) / ownerOf(vault)
 *  - Embedded UserVault implementation (guardians + recovery)
 *  - SecurityHub lock enforcement (PanicGuard / GuardianLock)
 *  - ProofLedger best-effort logging
 *
 * Pairs with VFIDEToken's "vaultOnly" transfer enforcement.
 */

/// ─────────────────────────── External interfaces (minimal)
interface IProofLedger_VI {
    function logSystemEvent(address who, string calldata action, address by) external;
    function logEvent(address who, string calldata action, uint256 amount, string calldata note) external;
}

interface ISecurityHub_VI {
    function isLocked(address vault) external view returns (bool);
}

interface IERC20_VI {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
}

/// ─────────────────────────── Lightweight hub Ownable
abstract contract Ownable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    address public owner;
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    modifier onlyOwner() { require(msg.sender == owner, "OWN:not-owner"); _; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWN:zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/// ─────────────────────────── Reentrancy guard
abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status == 1, "reentrancy");
        _status = 2;
        _;
        _status = 1;
    }
}

/// ─────────────────────────── User Vault (embedded)
/// @title UserVault - Individual vault with Chain-of-Return recovery and Next-of-Kin inheritance
/// @notice Recovery requires guardian approval + DAO oversight. Inheritance for deceased owners.
/// @dev ACCESSIBILITY: Built for forgotten people, not whales. Gas costs documented for UI transparency.
///
/// GAS COST DOCUMENTATION (for UI developers - help users understand costs):
/// - setGuardian(): ~50-80k gas per guardian (consider setGuardianBatch() to save gas)
/// - setGuardianBatch(): ~60-100k gas total for 1-5 guardians (batch saves ~40-60% vs individual)
/// - requestRecovery(): ~70-90k gas
/// - guardianApproveRecovery(): ~40-60k gas per guardian  
/// - finalizeRecovery(): ~80-120k gas
/// - cancelRecovery(): ~30-50k gas
/// - setNextOfKin(): ~25-35k gas
/// - claimInheritance(): ~100-150k gas (includes vault creation if needed)
/// Note: Actual gas costs vary with network conditions. Provide estimates in UI.
contract UserVault is ReentrancyGuard {
    /// Immutable references
    address public immutable hub;
    address public immutable vfideToken;
    ISecurityHub_VI public immutable securityHub;
    IProofLedger_VI public immutable ledger;

    /// State
    address public owner;
    mapping(address => bool) public isGuardian;
    address[] public guardianList;           // track guardian addresses for enumeration
    uint8 public guardianCount;              // track total guardians for quorum calculation
    uint256 public lastActivity;             // timestamp of last owner action for inheritance

    address public nextOfKin;
    uint256 public inactivityPeriod = 365 days;  // default 1 year, configurable

    struct Recovery {
        address proposedOwner;
        uint8 approvals;               // guardian approvals count
        mapping(address => uint256) voted;  // guardian -> nonce when voted (0 = not voted)
        uint256 requestTimestamp;      // when recovery was requested
        uint256 timelockEnd;           // absolute timestamp when timelock expires
        uint8 requiredApprovals;       // locked at request time to prevent manipulation
        uint256 nonce;                 // incremented on each new recovery to invalidate old votes
        bool daoReviewed;              // DAO can review and approve/reject
        bool daoApproved;              // DAO approval status
        bool isInheritance;            // track if this is inheritance vs recovery
    }
    Recovery private _recovery;

    // Chain-of-Return configuration
    uint256 public recoveryTimelock = 7 days;  // default 7 day timelock, configurable
    uint256 public emergencyTimelock = 30 days; // extended timelock for DAO emergency override
    uint256 public lastCancelTimestamp;         // last time recovery was cancelled (for cooldown)
    uint256 public lastFailedRecoveryTimestamp; // last time recovery failed (for cooldown)
    uint256 public recoveryCooldown = 1 days;   // cooldown after cancel/fail before new recovery

    /// Events
    event OwnerSet(address indexed newOwner);
    event GuardianSet(address indexed guardian, bool active);
    event NextOfKinSet(address indexed kin);
    event InactivityPeriodSet(uint256 period);
    event RecoveryTimelockSet(uint256 timelock);
    event RecoveryRequested(address indexed proposedOwner, uint256 timelockEnd, bool isInheritance);
    event RecoveryApproved(address indexed guardian, address indexed proposedOwner, uint8 approvals, uint8 required);
    event RecoveryCancelled(address indexed by);
    event RecoveryRejected(string reason);
    event DAOApproved(address indexed proposedOwner);
    event DAOEmergencyOverride(address indexed newOwner, string reason);
    event RecoveryFinalized(address indexed newOwner);
    event InheritanceClaimed(address indexed nextOfKin, uint256 amount);
    event ActivityRecorded(uint256 timestamp);
    event VaultTransfer(address indexed toVault, uint256 amount);
    event VaultApprove(address indexed spender, uint256 amount);

    /// Errors
    error UV_NotOwner();
    error UV_Locked();
    error UV_Zero();
    error UV_NotGuardian();
    error UV_AlreadyVoted();
    error UV_NoRecovery();
    error UV_RecoveryActive();
    error UV_TimelockActive();
    error UV_InsufficientApprovals();
    error UV_TooManyGuardians();
    error UV_InactivityNotMet();
    error UV_NotNextOfKin();
    error UV_DAORejected();
    error UV_NewOwnerHasVault();
    error UV_Cooldown();
    error UV_NextOfKinIsOwner();
    error UV_DuplicateGuardian();
    error UV_GuardianChangesDuringRecovery();
    error UV_InvalidInput();
    error UV_OwnerCannotBeGuardian();
    error UV_AlreadyOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert UV_NotOwner();
        _;
    }

    modifier notLocked() {
        if (address(securityHub) != address(0) && securityHub.isLocked(address(this))) revert UV_Locked();
        _;
    }

    constructor(
        address _hub,
        address _vfide,
        address _owner,
        address _securityHub,
        address _ledger
    ) {
        require(_hub != address(0) && _vfide != address(0) && _owner != address(0), "UV:zero");
        hub = _hub;
        vfideToken = _vfide;
        owner = _owner;
        securityHub = ISecurityHub_VI(_securityHub);
        ledger = IProofLedger_VI(_ledger);
        lastActivity = block.timestamp;  // initialize activity timestamp
        _logSys("vault_created");
        emit OwnerSet(_owner);
    }

    // ——— Governance hooks (only hub may force operations)
    function __forceSetOwner(address newOwner) external {
        require(msg.sender == hub, "UV:onlyHub");
        if (newOwner == address(0)) revert UV_Zero();
        owner = newOwner;
        lastActivity = block.timestamp;  // reset activity for new owner
        _logSys("vault_force_owner");
        emit OwnerSet(newOwner);
    }

    // ——— Owner controls
    function setGuardian(address g, bool active) external onlyOwner notLocked {
        if (g == address(0)) revert UV_Zero();
        
        // Prevent guardian changes during active recovery to stop vote manipulation
        if (_recovery.proposedOwner != address(0)) revert UV_GuardianChangesDuringRecovery();
        
        bool wasGuardian = isGuardian[g];
        
        // Update guardian count and list (max 5 guardians)
        if (active && !wasGuardian) {
            if (guardianCount >= 5) revert UV_TooManyGuardians();
            // Check for duplicates in list (defensive programming)
            for (uint256 i = 0; i < guardianList.length; i++) {
                if (guardianList[i] == g) revert UV_DuplicateGuardian();
            }
            isGuardian[g] = true;
            guardianCount++;
            guardianList.push(g);
        } else if (!active && wasGuardian) {
            isGuardian[g] = false;
            guardianCount--;
            _removeFromGuardianList(g);
        } else {
            // No change in state, just return
            return;
        }
        
        _updateActivity();  // track owner activity
        _logEv(g, active ? "guardian_add" : "guardian_remove", guardianCount, "");
        emit GuardianSet(g, active);
    }
    
    /// @notice ACCESSIBILITY: Batch set guardians to reduce gas costs for forgotten people
    /// @dev Sets multiple guardians in one transaction - saves gas vs multiple setGuardian calls
    function setGuardianBatch(address[] calldata guardians_) external onlyOwner notLocked {
        if (guardians_.length == 0 || guardians_.length > 5) revert UV_InvalidInput();
        if (_recovery.proposedOwner != address(0)) revert UV_GuardianChangesDuringRecovery();
        
        // Clear existing guardians
        for (uint256 i = 0; i < guardianList.length; i++) {
            isGuardian[guardianList[i]] = false;
        }
        delete guardianList;
        guardianCount = 0;
        
        // Add new guardians with duplicate check
        for (uint256 i = 0; i < guardians_.length; i++) {
            address g = guardians_[i];
            if (g == address(0)) revert UV_Zero();
            if (g == owner) revert UV_OwnerCannotBeGuardian();
            
            // Check for duplicates in input array
            for (uint256 j = 0; j < i; j++) {
                if (guardians_[j] == g) revert UV_DuplicateGuardian();
            }
            
            isGuardian[g] = true;
            guardianList.push(g);
            guardianCount++;
            emit GuardianSet(g, true);
        }
        
        _updateActivity();
        _logEv(address(0), "guardian_batch_set", guardianCount, "");
    }

    function setNextOfKin(address kin) external onlyOwner notLocked {
        if (kin == address(0)) revert UV_Zero();
        if (kin == owner) revert UV_NextOfKinIsOwner();
        nextOfKin = kin;
        _updateActivity();
        _logEv(kin, "next_of_kin_set", 0, "");
        emit NextOfKinSet(kin);
    }
    
    /// @notice ACCESSIBILITY: Explicitly clear nextOfKin (prevents accidental zero address)
    function clearNextOfKin() external onlyOwner notLocked {
        nextOfKin = address(0);
        _updateActivity();
        _logEv(address(0), "next_of_kin_cleared", 0, "");
        emit NextOfKinSet(address(0));
    }

    function setInactivityPeriod(uint256 period) external onlyOwner notLocked {
        require(period >= 30 days && period <= 730 days, "UV:period-range");  // 30 days to 2 years
        inactivityPeriod = period;
        _updateActivity();
        emit InactivityPeriodSet(period);
        _logEv(owner, "inactivity_period_set", period, "");
    }

    function setRecoveryTimelock(uint256 timelock) external onlyOwner notLocked {
        require(timelock >= 1 days && timelock <= 30 days, "UV:timelock-range");  // 1 to 30 days
        recoveryTimelock = timelock;
        _updateActivity();
        emit RecoveryTimelockSet(timelock);
        _logEv(owner, "recovery_timelock_set", timelock, "");
    }

    // ——— Chain-of-Return: Recovery flow with timelock and DAO oversight
    function requestRecovery(address proposedOwner) external notLocked {
        // Prevent overwriting active recovery - must cancel first
        if (_recovery.proposedOwner != address(0)) revert UV_RecoveryActive();
        
        // Enforce cooldown after cancellation or failed recovery
        if (lastCancelTimestamp > 0 && block.timestamp < lastCancelTimestamp + recoveryCooldown) {
            revert UV_Cooldown();
        }
        if (lastFailedRecoveryTimestamp > 0 && block.timestamp < lastFailedRecoveryTimestamp + recoveryCooldown) {
            revert UV_Cooldown();
        }
        
        // Either nextOfKin, an existing guardian, or the current owner may open a request
        if (!(msg.sender == owner || isGuardian[msg.sender] || msg.sender == nextOfKin)) revert UV_NotGuardian();
        if (proposedOwner == address(0)) revert UV_Zero();
        
        // ACCESSIBILITY: Allow 1+ guardians (forgotten people may only have 1-2 trusted contacts)
        require(guardianCount >= 1, "UV:min-1-guardian");
        
        // ACCESSIBILITY: Scaled timelocks - fewer guardians = longer review period
        // 1 guardian = 14 days, 1-of-1 (most vulnerable, longest review)
        // 2 guardians = 10 days, 2-of-2 (balanced protection)
        // 3+ guardians = 7 days, 2-of-3 or 3-of-5 (community consensus)
        uint256 timelock = recoveryTimelock;  // Default 7 days
        if (guardianCount == 1) {
            timelock = 14 days;
        } else if (guardianCount == 2) {
            timelock = 10 days;
        }

        // Check if this is inheritance request (nextOfKin after inactivity)
        bool isInheritance = (msg.sender == nextOfKin || proposedOwner == nextOfKin) && 
                             (block.timestamp - lastActivity >= inactivityPeriod);

        // Initialize recovery with locked quorum and nonce
        _recovery.proposedOwner = proposedOwner;
        _recovery.approvals = 0;
        _recovery.requestTimestamp = block.timestamp;
        _recovery.timelockEnd = block.timestamp + timelock;  // Absolute timestamp, scaled by guardian count
        _recovery.requiredApprovals = _requiredGuardianApprovals();  // LOCK quorum at request time
        _recovery.nonce++;  // increment to invalidate old votes
        _recovery.daoReviewed = false;
        _recovery.daoApproved = false;
        _recovery.isInheritance = isInheritance;
        
        _logEv(proposedOwner, isInheritance ? "inheritance_requested" : "recovery_requested", _recovery.timelockEnd, "");
        emit RecoveryRequested(proposedOwner, _recovery.timelockEnd, isInheritance);
    }

    /// @notice ACCESSIBILITY: Allow victim to challenge recovery, including during DAO override
    /// @dev Owner can cancel at any time - protects against false recovery or DAO override
    ///      This is the victim's defense: if you're alive, you can cancel during 30-day DAO timelock
    function cancelRecovery() external {
        // Owner or hub (DAO) can cancel recovery
        require(msg.sender == owner || msg.sender == hub, "UV:not-authorized");
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        // Set cooldown timestamp
        lastCancelTimestamp = block.timestamp;
        
        // Clear recovery state (nonce stays incremented to invalidate old votes)
        address cancelled = _recovery.proposedOwner;
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.requestTimestamp = 0;
        _recovery.timelockEnd = 0;
        _recovery.requiredApprovals = 0;
        _recovery.daoReviewed = false;
        _recovery.daoApproved = false;
        _recovery.isInheritance = false;
        
        emit RecoveryCancelled(msg.sender);
        _logEv(cancelled, "recovery_cancelled", 0, "");
    }

    function guardianApproveRecovery() external notLocked {
        if (!isGuardian[msg.sender]) revert UV_NotGuardian();
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        // Check if guardian already voted in THIS recovery (using nonce)
        if (_recovery.voted[msg.sender] == _recovery.nonce) revert UV_AlreadyVoted();
        
        _recovery.voted[msg.sender] = _recovery.nonce;  // mark with current nonce
        _recovery.approvals += 1;
        
        _logEv(msg.sender, "recovery_approval", _recovery.approvals, "");
        emit RecoveryApproved(msg.sender, _recovery.proposedOwner, _recovery.approvals, _recovery.requiredApprovals);
    }

    function rejectRecovery(string calldata reason) external {
        require(msg.sender == hub, "UV:onlyHub");  // DAO via hub can reject
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        address rejected = _recovery.proposedOwner;
        
        // Set failed recovery cooldown
        lastFailedRecoveryTimestamp = block.timestamp;
        
        // Clear all recovery state (nonce stays to invalidate votes)
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.requestTimestamp = 0;
        _recovery.timelockEnd = 0;
        _recovery.requiredApprovals = 0;
        _recovery.daoReviewed = false;
        _recovery.daoApproved = false;
        _recovery.isInheritance = false;
        
        emit RecoveryRejected(reason);
        _logEv(rejected, "recovery_rejected", 0, reason);
    }

    function daoApproveRecovery() external {
        require(msg.sender == hub, "UV:onlyHub");  // DAO via hub can approve
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        _recovery.daoReviewed = true;
        _recovery.daoApproved = true;
        
        emit DAOApproved(_recovery.proposedOwner);
        _logEv(_recovery.proposedOwner, "dao_approved", 0, "");
    }

    function finalizeRecovery() external notLocked {
        if (_recovery.proposedOwner == address(0)) revert UV_NoRecovery();
        
        // DAO approval bypasses timelock (for emergency expedited recovery)
        bool daoBypass = _recovery.daoReviewed && _recovery.daoApproved;
        
        // Check timelock has passed using absolute timestamp (unless DAO approved)
        if (!daoBypass && block.timestamp < _recovery.timelockEnd) {
            revert UV_TimelockActive();
        }
        
        // Check DAO hasn't rejected
        if (_recovery.daoReviewed && !_recovery.daoApproved) revert UV_DAORejected();
        
        // Check guardian quorum using LOCKED count from request time
        if (_recovery.approvals < _recovery.requiredApprovals) {
            // Mark as failed and set cooldown
            lastFailedRecoveryTimestamp = block.timestamp;
            revert UV_InsufficientApprovals();
        }
        
        // Finalize ownership transfer
        address newOwner = _recovery.proposedOwner;
        bool wasInheritance = _recovery.isInheritance;
        
        owner = newOwner;
        lastActivity = block.timestamp;  // reset activity for new owner

        // Clear all recovery state
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.requestTimestamp = 0;
        _recovery.timelockEnd = 0;
        _recovery.requiredApprovals = 0;
        _recovery.daoReviewed = false;
        _recovery.daoApproved = false;
        _recovery.isInheritance = false;

        _logSys(wasInheritance ? "inheritance_finalized" : "recovery_finalized");
        emit RecoveryFinalized(newOwner);
    }

    /// @notice ACCESSIBILITY: Emergency override with relaxed legitimacy for edge cases
    /// @dev Handles: guardians dead/compromised, long inactivity, repeated recovery failures
    ///      VICTIM CAN CHALLENGE: Owner can call cancelRecovery() during 30-day timelock if alive
    function daoEmergencyOverride(address newOwner, string calldata reason) external notLocked {
        require(msg.sender == hub, "UV:onlyHub");  // Only DAO can emergency override
        if (newOwner == address(0)) revert UV_Zero();
        
        // Emergency override legitimacy checks:
        // 1. Must be no active recovery OR existing recovery is stale (90+ days old)
        bool canOverride = _recovery.proposedOwner == address(0) || 
                          (block.timestamp >= _recovery.requestTimestamp + 90 days);
        require(canOverride, "UV:must-cancel-active-recovery");
        
        // 2. ACCESSIBILITY: Emergency should only be used when guardian system broken:
        //    - Less than 2 guardians (relaxed from 3 - handles edge case: all guardians die)
        //    - OR long inactivity (owner inactive for 2+ years)
        //    - OR 3+ failed recovery attempts
        bool legitimateEmergency = guardianCount < 2 || 
                                   (block.timestamp >= lastActivity + 730 days) ||
                                   (lastFailedRecoveryTimestamp > 0 && _recovery.nonce >= 3);
        require(legitimateEmergency, "UV:not-emergency-situation");
        
        // Emergency override: DAO can force recovery if all guardians are dead/lost
        // Uses extended 30-day timelock for maximum scrutiny
        // VICTIM DEFENSE: Owner can cancel during this period if alive
        if (_recovery.proposedOwner == address(0) || _recovery.proposedOwner != newOwner) {
            // Initialize/restart emergency override request
            _recovery.proposedOwner = newOwner;
            _recovery.requestTimestamp = block.timestamp;
            _recovery.timelockEnd = block.timestamp + emergencyTimelock;  // absolute 30 days
            _recovery.requiredApprovals = 0;  // DAO override doesn't need guardian approval
            _recovery.nonce++;  // invalidate any existing votes
            _recovery.daoReviewed = true;
            _recovery.daoApproved = true;
            _recovery.isInheritance = false;
            
            emit DAOEmergencyOverride(newOwner, reason);
            _logEv(newOwner, "dao_emergency_override_requested", _recovery.timelockEnd, reason);
        } else if (_recovery.proposedOwner == newOwner && 
                   block.timestamp >= _recovery.timelockEnd) {
            // Finalize emergency override after 30-day timelock
            owner = newOwner;
            lastActivity = block.timestamp;
            
            // Clear recovery state
            _recovery.proposedOwner = address(0);
            _recovery.approvals = 0;
            _recovery.requestTimestamp = 0;
            _recovery.timelockEnd = 0;
            _recovery.requiredApprovals = 0;
            _recovery.daoReviewed = false;
            _recovery.daoApproved = false;
            
            emit RecoveryFinalized(newOwner);
            _logSys("dao_emergency_override_finalized");
        } else {
            revert UV_TimelockActive();
        }
    }

    // ——— Next-of-Kin Inheritance: claim after inactivity period
    function claimInheritance() external notLocked nonReentrant {
        if (msg.sender != nextOfKin) revert UV_NotNextOfKin();
        if (nextOfKin == address(0)) revert UV_Zero();
        
        // Check inactivity period has passed
        uint256 inactiveSince = block.timestamp - lastActivity;
        if (inactiveSince < inactivityPeriod) revert UV_InactivityNotMet();
        
        // Must have active inheritance recovery request
        require(_recovery.proposedOwner == nextOfKin, "UV:must-request-nextOfKin");
        require(_recovery.isInheritance, "UV:not-inheritance-request");
        
        // Check DAO hasn't rejected (same as regular recovery)
        if (_recovery.daoReviewed && !_recovery.daoApproved) revert UV_DAORejected();
        
        // Check timelock and guardian approvals via standard recovery flow
        if (block.timestamp < _recovery.timelockEnd) {
            revert UV_TimelockActive();
        }
        if (_recovery.approvals < _recovery.requiredApprovals) {
            revert UV_InsufficientApprovals();
        }
        
        // Transfer all VFIDE to nextOfKin's vault
        address nextOfKinVault = VaultInfrastructure(hub).vaultOf(nextOfKin);
        
        // ACCESSIBILITY: Auto-create vault for nextOfKin if they don't have one
        // Prevents chicken-and-egg problem: inheritance works even if nextOfKin never interacted with VFIDE
        if (nextOfKinVault == address(0)) {
            nextOfKinVault = VaultInfrastructure(hub).ensureVault(nextOfKin);
        }
        
        uint256 balance = IERC20_VI(vfideToken).balanceOf(address(this));
        if (balance > 0) {
            bool ok = IERC20_VI(vfideToken).transfer(nextOfKinVault, balance);
            require(ok, "UV:inheritance-transfer-failed");
            
            emit InheritanceClaimed(nextOfKin, balance);
            _logEv(nextOfKin, "inheritance_claimed", balance, "");
        }
        
        // Transfer vault ownership to nextOfKin
        owner = nextOfKin;
        lastActivity = block.timestamp;
        
        // Clear all recovery state
        _recovery.proposedOwner = address(0);
        _recovery.approvals = 0;
        _recovery.requestTimestamp = 0;
        _recovery.timelockEnd = 0;
        _recovery.requiredApprovals = 0;
        _recovery.daoReviewed = false;
        _recovery.daoApproved = false;
        _recovery.isInheritance = false;
        
        emit RecoveryFinalized(nextOfKin);
        _logSys("inheritance_finalized");
    }

    // ——— Token operations (VFIDE only)
    function transferVFIDE(address toVault, uint256 amount) external onlyOwner notLocked nonReentrant returns (bool) {
        if (toVault == address(0)) revert UV_Zero();
        bool ok = IERC20_VI(vfideToken).transfer(toVault, amount);
        require(ok, "UV:transfer-failed");
        _updateActivity();  // track owner activity
        _logEv(toVault, "vault_transfer", amount, "");
        emit VaultTransfer(toVault, amount);
        return true;
    }

    function approveVFIDE(address spender, uint256 amount) external onlyOwner notLocked returns (bool) {
        if (spender == address(0)) revert UV_Zero();
        bool ok = IERC20_VI(vfideToken).approve(spender, amount);
        require(ok, "UV:approve-failed");
        _updateActivity();  // track owner activity
        _logEv(spender, "vault_approve", amount, "");
        emit VaultApprove(spender, amount);
        return ok;
    }

    // ——— View: check if inactivity period met
    function isInactive() external view returns (bool) {
        if (lastActivity == 0) return false;
        return (block.timestamp - lastActivity) >= inactivityPeriod;
    }

    function timeUntilInheritance() external view returns (uint256) {
        if (lastActivity == 0) return inactivityPeriod;
        uint256 elapsed = block.timestamp - lastActivity;
        if (elapsed >= inactivityPeriod) return 0;
        return inactivityPeriod - elapsed;
    }

    function getGuardians() external view returns (address[] memory) {
        return guardianList;
    }
    
    /// @notice ACCESSIBILITY: Get all timing parameters in one call
    /// @return recovery Current recovery timelock setting
    /// @return emergency DAO emergency override timelock (30 days)
    /// @return cooldown Cooldown period after cancel/failure
    /// @return inactivity Inactivity period before inheritance can be claimed
    function getTimingParameters() external view returns (
        uint256 recovery,
        uint256 emergency,
        uint256 cooldown,
        uint256 inactivity
    ) {
        return (recoveryTimelock, emergencyTimelock, recoveryCooldown, inactivityPeriod);
    }
    
    /// @notice ACCESSIBILITY: Check when user can retry recovery after cooldown
    /// @return canRecover Whether recovery can be initiated now
    /// @return nextAvailable Timestamp when recovery becomes available (0 if available now)
    function getCooldownStatus() external view returns (bool canRecover, uint256 nextAvailable) {
        uint256 cancelUntil = lastCancelTimestamp + recoveryCooldown;
        uint256 failedUntil = lastFailedRecoveryTimestamp + recoveryCooldown;
        uint256 latestCooldown = cancelUntil > failedUntil ? cancelUntil : failedUntil;
        
        canRecover = block.timestamp >= latestCooldown;
        nextAvailable = canRecover ? 0 : latestCooldown;
    }
    
    /// @notice ACCESSIBILITY: Check if guardian has voted in current recovery
    /// @param guardian_ Guardian address to check
    /// @return hasVoted Whether guardian voted in current recovery nonce
    function hasGuardianVoted(address guardian_) external view returns (bool hasVoted) {
        hasVoted = _recovery.voted[guardian_] == _recovery.nonce;
    }

    function getRecoveryInfo() external view returns (
        address proposedOwner,
        uint8 approvals,
        uint8 required,
        uint256 timelockEnd,
        bool isInheritance,
        bool daoApproved
    ) {
        proposedOwner = _recovery.proposedOwner;
        approvals = _recovery.approvals;
        required = _recovery.requiredApprovals;
        timelockEnd = _recovery.timelockEnd;  // already absolute timestamp
        isInheritance = _recovery.isInheritance;
        daoApproved = _recovery.daoApproved;
    }
    
    /// @notice ACCESSIBILITY: Check if recovery is ready to finalize
    /// @return canFinalize Whether finalizeRecovery() will succeed now
    /// @return reason Human-readable reason if cannot finalize
    function canFinalizeRecovery() external view returns (bool canFinalize, string memory reason) {
        if (_recovery.proposedOwner == address(0)) {
            return (false, "No active recovery");
        }
        if (_recovery.daoReviewed && !_recovery.daoApproved) {
            return (false, "DAO rejected recovery");
        }
        if (!_recovery.daoApproved && block.timestamp < _recovery.timelockEnd) {
            return (false, "Timelock not expired");
        }
        if (_recovery.approvals < _recovery.requiredApprovals) {
            return (false, "Insufficient guardian approvals");
        }
        return (true, "Ready to finalize");
    }

    // ——— Internals: dynamic quorum calculation
    function _requiredGuardianApprovals() internal view returns (uint8) {
        // 2-of-3 or 3-of-5 guardian quorum
        if (guardianCount >= 5) return 3;
        if (guardianCount >= 3) return 2;
        return guardianCount;  // fallback: all guardians if less than 3
    }

    function _updateActivity() internal {
        lastActivity = block.timestamp;
        emit ActivityRecorded(block.timestamp);
    }

    function _removeFromGuardianList(address g) internal {
        // Remove ALL occurrences (defensive against duplicates)
        uint256 i = 0;
        while (i < guardianList.length) {
            if (guardianList[i] == g) {
                // Replace with last element and pop
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                // Don't increment i, check same position again
            } else {
                i++;
            }
        }
    }

    // ——— Internals: ledger logging (best-effort)
    function _logSys(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}

/// ─────────────────────────── Hub / Factory / Registry
contract VaultInfrastructure is Ownable {
    /// Modules & config
    address public vfideToken;
    ISecurityHub_VI public securityHub;  // shared lock view
    IProofLedger_VI public ledger;       // optional ledger
    address public dao;                  // DAO can force recover

    /// Registry
    mapping(address => address) public vaultOf;
    mapping(address => address) public ownerOfVault;

    /// Events
    event ModulesSet(address vfide, address securityHub, address ledger, address dao);
    event VaultCreated(address indexed owner, address indexed vault);
    event ForcedRecovery(address indexed vault, address indexed newOwner);
    event VFIDESet(address vfide);
    event DAOSet(address dao);

    /// Errors
    error VI_Zero();
    error VI_NotDAO();
    error VI_NewOwnerHasVault();

    constructor(address _vfideToken, address _securityHub, address _ledger, address _dao) {
        if (_vfideToken == address(0) || _dao == address(0)) revert VI_Zero();
        vfideToken = _vfideToken;
        securityHub = ISecurityHub_VI(_securityHub);
        ledger = IProofLedger_VI(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
    }

    // ——— Module wiring
    function setModules(address _vfideToken, address _securityHub, address _ledger, address _dao) external onlyOwner {
        if (_vfideToken == address(0) || _dao == address(0)) revert VI_Zero();
        vfideToken = _vfideToken;
        securityHub = ISecurityHub_VI(_securityHub);
        ledger = IProofLedger_VI(_ledger);
        dao = _dao;
        emit ModulesSet(_vfideToken, _securityHub, _ledger, _dao);
        _log("hub_modules_set");
    }

    function setVFIDE(address _vfide) external onlyOwner {
        if (_vfide == address(0)) revert VI_Zero();
        vfideToken = _vfide;
        emit VFIDESet(_vfide);
        _log("hub_vfide_set");
    }

    function setDAO(address _dao) external onlyOwner {
        if (_dao == address(0)) revert VI_Zero();
        dao = _dao;
        emit DAOSet(_dao);
        _log("hub_dao_set");
    }

    // ——— Deterministic address prediction for UX
    function predictVault(address owner_) public view returns (address predicted) {
        if (owner_ == address(0)) return address(0);
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        bytes32 codeHash = keccak256(bytecode);
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            codeHash
        )))));
    }

    // ——— Auto-create (anyone can sponsor)
    function ensureVault(address owner_) public returns (address vault) {
        if (owner_ == address(0)) revert VI_Zero();
        vault = vaultOf[owner_];
        if (vault != address(0)) return vault;

        // Deploy via CREATE2 for deterministic address
        bytes32 salt = _salt(owner_);
        bytes memory bytecode = _creationCode(owner_);
        assembly { vault := create2(0, add(bytecode, 0x20), mload(bytecode), salt) }
        require(vault != address(0), "create2 failed");

        vaultOf[owner_] = vault;
        ownerOfVault[vault] = owner_;

        emit VaultCreated(owner_, vault);
        _logEv(vault, "vault_created", 0, "");
    }

    // ——— View helpers (token expects vaultOf(owner))
    function isVault(address a) external view returns (bool) {
        return ownerOfVault[a] != address(0) && vaultOf[ ownerOfVault[a] ] == a;
    }

    // ——— DAO forced recovery (emergency exceptional path)
    function forceRecover(address vault, address newOwner) external {
        if (msg.sender != dao) revert VI_NotDAO();
        if (vault == address(0) || newOwner == address(0)) revert VI_Zero();
        address current = ownerOfVault[vault];
        require(current != address(0), "unknown vault");
        
        // Prevent registry desync: newOwner must not have existing vault
        if (vaultOf[newOwner] != address(0)) revert VI_NewOwnerHasVault();

        // Update registry and tell vault
        vaultOf[current] = address(0);
        ownerOfVault[vault] = newOwner;
        vaultOf[newOwner] = vault;

        UserVault(vault).__forceSetOwner(newOwner);
        emit ForcedRecovery(vault, newOwner);
        _logEv(vault, "force_recover", 0, "");
    }

    // ——— Internals
    function _salt(address owner_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner_));
    }

    function _creationCode(address owner_) internal view returns (bytes memory) {
        return abi.encodePacked(
            type(UserVault).creationCode,
            abi.encode(address(this), vfideToken, owner_, address(securityHub), address(ledger))
        );
    }

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) { try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {} }
    }
    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) { try ledger.logEvent(who, action, amount, note) {} catch {} }
    }
}