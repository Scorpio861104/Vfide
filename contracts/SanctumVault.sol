// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * SanctumVault — Charity & Impact Fund for VFIDE Ecosystem
 * ----------------------------------------------------------
 * Per VFIDE Ecosystem Overview Section 8.3:
 * - Dedicated vault for charitable use and real-world impact
 * - Holds VFIDE and/or stablecoins
 * - Receives percentage of certain flows (fees, donations, campaigns)
 * - Disbursements are on-chain, tracked per campaign/project
 * - Governed by DAO (charity selection, size, cadence)
 * - All transactions logged in ProofLedger for transparency
 * 
 * Target split mentioned: e.g., 25% to Sanctum, 75% to burn
 * (exact ratios configurable by DAO)
 */

import "./SharedInterfaces.sol";

// Seer interface for ProofScore
interface ISeer_Sanct {
    function reward(address subject, uint16 delta, string calldata reason) external;
}

error SANCT_NotDAO();
error SANCT_Zero();
error SANCT_NotApproved();
error SANCT_AlreadyApproved();
error SANCT_InsufficientBalance();

contract SanctumVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// Events
    event DAOSet(address dao);
    event LedgerSet(address ledger);
    event CharityApproved(address indexed charity, string name, string category);
    event CharityRemoved(address indexed charity, string reason);
    event DisbursementProposed(uint256 indexed proposalId, address indexed charity, address token, uint256 amount, string campaign);
    event DisbursementApproved(uint256 indexed proposalId, address indexed approver);
    event DisbursementExecuted(uint256 indexed proposalId, address indexed charity, address token, uint256 amount);
    event DisbursementRejected(uint256 indexed proposalId, string reason);
    event Deposit(address indexed from, address indexed token, uint256 amount, string note);
    event NativeWithdrawal(address indexed to, uint256 amount);
    event ApprovalsRequiredSet(uint8 required);

    /// DAO control (can be DAO contract or multisig)
    address public dao;
    IProofLedger public ledger;
    ISeer_Sanct public seer;
    
    // ProofScore rewards for charitable actions
    uint16 public constant DONATION_REWARD = 10;  // +1.0 per donation

    /// Charity registry
    struct CharityInfo {
        bool approved;
        string name;
        string category; // e.g., "education", "environment", "health", etc.
        uint64 approvedAt;
    }
    mapping(address => CharityInfo) public charities;
    address[] public charityList;

    /// Disbursement proposals
    struct Disbursement {
        address charity;
        address token;       // VFIDE or stablecoin
        uint256 amount;
        string campaign;     // campaign or project description
        string documentation; // IPFS hash or URL to impact report
        uint64 proposedAt;
        uint64 executedAt;
        bool executed;
        bool rejected;
        mapping(address => bool) approvals;
        uint8 approvalCount;
    }
    uint256 public disbursementCount;
    mapping(uint256 => Disbursement) public disbursements;

    /// Governance
    uint8 public approvalsRequired = 1; // Default to 1 (DAO only)
    mapping(address => bool) public isApprover; // DAO members who can approve
    mapping(address => uint256) public approverIndex; // M-4 Fix: O(1) removal index
    address[] public approvers;

    modifier onlyDAO() {
        _checkDAO();
        _;
    }

    function _checkDAO() internal view {
        if (msg.sender != dao) revert SANCT_NotDAO();
    }

    modifier onlyApprover() {
        _checkApprover();
        _;
    }

    function _checkApprover() internal view {
        require(isApprover[msg.sender] || msg.sender == dao, "not approver");
    }

    constructor(address _dao, address _ledger, address _seer) {
        require(_dao != address(0), "zero dao");
        dao = _dao;
        ledger = IProofLedger(_ledger);
        if (_seer != address(0)) seer = ISeer_Sanct(_seer);
        
        // DAO is initial approver
        isApprover[_dao] = true;
        approverIndex[_dao] = 0; // M-4 Fix: Track index
        approvers.push(_dao);
        
        emit DAOSet(_dao);
        if (_ledger != address(0)) emit LedgerSet(_ledger);
    }

    // ─────────────────────────── Admin: DAO controls

    function setDAO(address _dao) external onlyDAO {
        if (_dao == address(0)) revert SANCT_Zero();
        address oldDAO = dao;
        dao = _dao;

        if (oldDAO != _dao) {
            // Revoke stale approver privilege from prior DAO
            if (isApprover[oldDAO]) {
                isApprover[oldDAO] = false;

                uint256 oldIdx = approverIndex[oldDAO];
                uint256 lastIdx = approvers.length - 1;
                if (oldIdx != lastIdx) {
                    address lastApprover = approvers[lastIdx];
                    approvers[oldIdx] = lastApprover;
                    approverIndex[lastApprover] = oldIdx;
                }
                approvers.pop();
                delete approverIndex[oldDAO];
            }

            // Ensure the new DAO has approver permissions
            if (!isApprover[_dao]) {
                isApprover[_dao] = true;
                approverIndex[_dao] = approvers.length;
                approvers.push(_dao);
            }
        }

        emit DAOSet(_dao);
        _log("sanctum_dao_set");
    }

    function setLedger(address _ledger) external onlyDAO {
        ledger = IProofLedger(_ledger);
        emit LedgerSet(_ledger);
        _log("sanctum_ledger_set");
    }
    
    function setSeer(address _seer) external onlyDAO {
        seer = ISeer_Sanct(_seer);
    }

    function setApprovalsRequired(uint8 _required) external onlyDAO {
        require(_required > 0 && _required <= approvers.length, "bad threshold");
        approvalsRequired = _required;
        emit ApprovalsRequiredSet(_required);
        _log("sanctum_approvals_set");
    }

    function addApprover(address _approver) external onlyDAO {
        require(_approver != address(0), "zero");
        require(!isApprover[_approver], "already approver");
        isApprover[_approver] = true;
        approverIndex[_approver] = approvers.length; // M-4 Fix: Track index before push
        approvers.push(_approver);
        _log("sanctum_approver_added");
    }

    function removeApprover(address _approver) external onlyDAO {
        require(isApprover[_approver], "not approver");
        require(approvers.length > approvalsRequired, "would violate threshold");
        isApprover[_approver] = false;
        
        // M-4 Fix: O(1) swap-and-pop with index tracking
        uint256 idx = approverIndex[_approver];
        uint256 lastIdx = approvers.length - 1;
        
        if (idx != lastIdx) {
            address lastApprover = approvers[lastIdx];
            approvers[idx] = lastApprover;
            approverIndex[lastApprover] = idx;
        }
        approvers.pop();
        delete approverIndex[_approver];
        
        _log("sanctum_approver_removed");
    }

    // ─────────────────────────── Charity Management

    function approveCharity(
        address charity,
        string calldata name,
        string calldata category
    ) external onlyDAO {
        require(charity != address(0), "zero");
        require(!charities[charity].approved, "already approved");
        
        charities[charity] = CharityInfo({
            approved: true,
            name: name,
            category: category,
            approvedAt: uint64(block.timestamp)
        });
        
        charityList.push(charity);
        
        emit CharityApproved(charity, name, category);
        _logEv(charity, "charity_approved", 0, category);
    }

    function removeCharity(address charity, string calldata reason) external onlyDAO {
        require(charities[charity].approved, "not approved");
        
        charities[charity].approved = false;
        
        emit CharityRemoved(charity, reason);
        _logEv(charity, "charity_removed", 0, reason);
    }

    function getCharityCount() external view returns (uint256) {
        return charityList.length;
    }

    function getApproverCount() external view returns (uint256) {
        return approvers.length;
    }

    // ─────────────────────────── Deposits (receive funds)

    /**
     * Receive VFIDE or stablecoins into Sanctum
     * Can be called by fee routers, donation campaigns, or direct transfers
     * H-4 Fix: Use SafeERC20 for non-standard tokens like USDT
     */
    function deposit(address token, uint256 amount, string calldata note) external nonReentrant {
        require(token != address(0) && amount > 0, "invalid deposit");
        
        // H-4 Fix: Use safeTransferFrom for compatibility with USDT and other non-standard tokens
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Reward donor with ProofScore boost
        if (address(seer) != address(0)) {
            try seer.reward(msg.sender, DONATION_REWARD, "charity_donation") {} catch {}
        }
        
        emit Deposit(msg.sender, token, amount, note);
        _logEv(msg.sender, "sanctum_deposit", amount, note);
    }

    /**
     * Direct ETH/native token reception (if needed for L2 gas or bridge fees)
     */
    receive() external payable {
        emit Deposit(msg.sender, address(0), msg.value, "native_deposit");
        _logEv(msg.sender, "sanctum_native_deposit", msg.value, "");
    }

    /**
     * @notice Withdraw native asset held by this vault
     * @dev DAO-only rescue path for forced ETH sends and native donations
     */
    function withdrawNative(address payable to, uint256 amount) external onlyDAO nonReentrant {
        if (to == address(0) || amount < 1) revert SANCT_Zero();
        require(amount <= address(this).balance, "insufficient native");

        (bool sent, ) = to.call{value: amount}("");
        require(sent, "native transfer failed");

        emit NativeWithdrawal(to, amount);
        _logEv(to, "sanctum_native_withdraw", amount, "");
    }

    // ─────────────────────────── Disbursements (charity payouts)

    /**
     * Propose a disbursement to an approved charity
     * @param charity Approved charity address
     * @param token Token to disburse (VFIDE or stablecoin)
     * @param amount Amount to send
     * @param campaign Description of campaign/project
     * @param documentation IPFS hash or URL to impact report
     */
    function proposeDisbursement(
        address charity,
        address token,
        uint256 amount,
        string calldata campaign,
        string calldata documentation
    ) external onlyApprover returns (uint256 proposalId) {
        if (!charities[charity].approved) revert SANCT_NotApproved();
        require(token != address(0) && amount > 0, "invalid proposal");
        
        // Check balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert SANCT_InsufficientBalance();
        
        proposalId = ++disbursementCount;
        Disbursement storage d = disbursements[proposalId];
        
        d.charity = charity;
        d.token = token;
        d.amount = amount;
        d.campaign = campaign;
        d.documentation = documentation;
        d.proposedAt = uint64(block.timestamp);
        
        // Proposer automatically approves
        d.approvals[msg.sender] = true;
        d.approvalCount = 1;
        
        emit DisbursementProposed(proposalId, charity, token, amount, campaign);
        _logEv(charity, "disbursement_proposed", amount, campaign);
    }

    /**
     * Approve a disbursement proposal
     */
    function approveDisbursement(uint256 proposalId) external onlyApprover {
        Disbursement storage d = disbursements[proposalId];
        require(d.proposedAt != 0, "not found");
        require(!d.executed && !d.rejected, "already finalized");
        
        if (d.approvals[msg.sender]) revert SANCT_AlreadyApproved();
        
        d.approvals[msg.sender] = true;
        d.approvalCount++;
        
        emit DisbursementApproved(proposalId, msg.sender);
        _logEv(msg.sender, "disbursement_approval", proposalId, "");
    }

    /**
     * Execute a disbursement once sufficient approvals reached
     */
    function executeDisbursement(uint256 proposalId) external nonReentrant onlyApprover {
        Disbursement storage d = disbursements[proposalId];
        require(d.proposedAt != 0, "not found");
        require(!d.executed && !d.rejected, "already finalized");
        require(d.approvalCount >= approvalsRequired, "insufficient approvals");
        
        // Check balance again
        uint256 balance = IERC20(d.token).balanceOf(address(this));
        if (balance < d.amount) revert SANCT_InsufficientBalance();
        
        d.executed = true;
        d.executedAt = uint64(block.timestamp);
        
        // Execute transfer
        IERC20(d.token).safeTransfer(d.charity, d.amount);
        
        emit DisbursementExecuted(proposalId, d.charity, d.token, d.amount);
        _logEv(d.charity, "disbursement_executed", d.amount, d.campaign);
    }

    /**
     * Reject a disbursement proposal (DAO only)
     */
    function rejectDisbursement(uint256 proposalId, string calldata reason) external onlyDAO {
        Disbursement storage d = disbursements[proposalId];
        require(d.proposedAt != 0, "not found");
        require(!d.executed && !d.rejected, "already finalized");
        
        d.rejected = true;
        
        emit DisbursementRejected(proposalId, reason);
        _logEv(d.charity, "disbursement_rejected", proposalId, reason);
    }

    // ─────────────────────────── View functions

    function getDisbursement(uint256 proposalId) external view returns (
        address charity,
        address token,
        uint256 amount,
        string memory campaign,
        string memory documentation,
        uint64 proposedAt,
        uint64 executedAt,
        bool executed,
        bool rejected,
        uint8 approvalCount_
    ) {
        Disbursement storage d = disbursements[proposalId];
        return (
            d.charity,
            d.token,
            d.amount,
            d.campaign,
            d.documentation,
            d.proposedAt,
            d.executedAt,
            d.executed,
            d.rejected,
            d.approvalCount
        );
    }

    function hasApproved(uint256 proposalId, address approver) external view returns (bool) {
        return disbursements[proposalId].approvals[approver];
    }

    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getCharityInfo(address charity) external view returns (
        bool approved,
        string memory name,
        string memory category,
        uint64 approvedAt
    ) {
        CharityInfo storage c = charities[charity];
        return (c.approved, c.name, c.category, c.approvedAt);
    }

    // ─────────────────────────── Internal helpers

    function _log(string memory action) internal {
        if (address(ledger) != address(0)) {
            try ledger.logSystemEvent(address(this), action, msg.sender) {} catch {}
        }
    }

    function _logEv(address who, string memory action, uint256 amount, string memory note) internal {
        if (address(ledger) != address(0)) {
            try ledger.logEvent(who, action, amount, note) {} catch {}
        }
    }

    // ─────────────────────────── Emergency recovery (DAO only, with timelock)

    struct EmergencyRecoveryRequest {
        address token;
        address to;
        uint256 amount;
        string reason;
        uint256 requestedAt;
        bool executed;
        bool cancelled;
    }

    uint256 public emergencyRecoveryCount;
    mapping(uint256 => EmergencyRecoveryRequest) public emergencyRecoveries;
    uint256 public constant EMERGENCY_TIMELOCK = 2 days;

    event EmergencyRecoveryRequested(uint256 indexed id, address token, address to, uint256 amount, string reason);
    event EmergencyRecoveryCancelled(uint256 indexed id, string reason);
    event EmergencyRecoveryExecuted(uint256 indexed id, address token, address to, uint256 amount);

    /**
     * Request emergency token recovery (only if funds are stuck)
     * Requires DAO approval and timelock for transparency
     */
    function requestEmergencyRecovery(
        address token,
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyDAO returns (uint256 id) {
        require(token != address(0), "zero token");
        require(to != address(0), "zero to");
        require(amount > 0, "zero amount");
        
        id = ++emergencyRecoveryCount;
        emergencyRecoveries[id] = EmergencyRecoveryRequest({
            token: token,
            to: to,
            amount: amount,
            reason: reason,
            requestedAt: block.timestamp,
            executed: false,
            cancelled: false
        });
        
        emit EmergencyRecoveryRequested(id, token, to, amount, reason);
    }

    /**
     * Cancel an emergency recovery request
     */
    function cancelEmergencyRecovery(uint256 id, string calldata reason) external onlyDAO {
        EmergencyRecoveryRequest storage req = emergencyRecoveries[id];
        require(req.requestedAt != 0, "not found");
        require(!req.executed, "already executed");
        require(!req.cancelled, "already cancelled");
        
        req.cancelled = true;
        emit EmergencyRecoveryCancelled(id, reason);
    }

    /**
     * Execute emergency recovery after timelock
     */
    function executeEmergencyRecovery(uint256 id) external onlyDAO nonReentrant {
        EmergencyRecoveryRequest storage req = emergencyRecoveries[id];
        require(req.requestedAt != 0, "not found");
        require(!req.executed, "already executed");
        require(!req.cancelled, "cancelled");
        require(block.timestamp >= req.requestedAt + EMERGENCY_TIMELOCK, "timelock not passed");
        
        req.executed = true;
        
        IERC20(req.token).safeTransfer(req.to, req.amount);
        
        _logEv(req.to, "emergency_recovery", req.amount, req.reason);
        emit EmergencyRecoveryExecuted(id, req.token, req.to, req.amount);
    }
}
