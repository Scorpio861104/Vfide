// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     PROGRAMMABLE TRUST CONDITIONS                         ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Transactions that only execute when trust conditions are met.            ║
 * ║                                                                           ║
 * ║  Examples:                                                                ║
 * ║  - "Pay merchant X only if my score > 700 AND their score > 600"          ║
 * ║  - "Release escrow when both parties have 3+ endorsements"                ║
 * ║  - "Allow transfer only if recipient has never lost a dispute"            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

error TC_InvalidCondition();
error TC_ConditionNotMet();
error TC_NotAuthorized();
error TC_Expired();
error TC_AlreadyExecuted();

interface ISeer {
    function getScore(address user) external view returns (uint256);
    function getEndorsementCount(address user) external view returns (uint256);
    function getDisputeLosses(address user) external view returns (uint256);
    function getTransactionCount(address user) external view returns (uint256);
}

contract TrustConditions {
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           CONDITION TYPES
    // ═══════════════════════════════════════════════════════════════════════
    
    enum ConditionType {
        SCORE_MINIMUM,           // User must have minimum score
        SCORE_MAXIMUM,           // User must not exceed score (for risk limiting)
        ENDORSEMENT_COUNT,       // User must have X endorsements
        NO_DISPUTE_LOSSES,       // User has never lost a dispute
        TRANSACTION_COUNT,       // User has completed X+ transactions
        MUTUAL_SCORE,            // Both parties meet minimum score
        SCORE_DIFFERENCE,        // Score gap must be within X points
        COMBINED_SCORE,          // Sum of both scores must exceed X
        TIME_LOCKED,             // Can only execute after timestamp
        ENDORSEMENT_MUTUAL       // Parties must have endorsed each other
    }
    
    struct Condition {
        ConditionType conditionType;
        uint256 value;           // Threshold value
        address targetUser;      // Address this condition applies to (0x0 = sender)
        bool inverted;           // If true, condition must NOT be met
    }
    
    struct ConditionalAction {
        address creator;
        address target;          // Contract to call
        bytes data;              // Calldata
        uint256 value;           // ETH value
        Condition[] conditions;  // All must be met
        uint64 expiresAt;        // Expiration timestamp
        bool executed;
        bool cancelled;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    ISeer public seer;
    address public dao;
    
    mapping(bytes32 => ConditionalAction) public actions;
    mapping(address => bytes32[]) public userActions;
    
    uint256 public actionNonce;
    
    event ConditionCreated(bytes32 indexed id, address indexed creator, uint256 conditionCount);
    event ConditionExecuted(bytes32 indexed id, address indexed executor);
    event ConditionCancelled(bytes32 indexed id);
    event ConditionExpired(bytes32 indexed id);
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    constructor(address _seer, address _dao) {
        require(_seer != address(0) && _dao != address(0), "TC: zero address");
        seer = ISeer(_seer);
        dao = _dao;
    }
    
    modifier onlyDAO() {
        if (msg.sender != dao) revert TC_NotAuthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         CREATE CONDITIONAL ACTION
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a conditional action that only executes when all conditions are met
     * @param target Contract to call when conditions are met
     * @param data Calldata for the call
     * @param conditions Array of conditions that must ALL be satisfied
     * @param expiresAt Timestamp after which action cannot be executed
     */
    function createConditionalAction(
        address target,
        bytes calldata data,
        Condition[] calldata conditions,
        uint64 expiresAt
    ) external payable returns (bytes32 id) {
        require(target != address(0), "TC: zero target");
        require(conditions.length > 0 && conditions.length <= 10, "TC: invalid condition count");
        require(expiresAt > block.timestamp, "TC: already expired");
        
        id = keccak256(abi.encode(msg.sender, target, data, actionNonce++));
        
        ConditionalAction storage action = actions[id];
        action.creator = msg.sender;
        action.target = target;
        action.data = data;
        action.value = msg.value;
        action.expiresAt = expiresAt;
        
        for (uint256 i = 0; i < conditions.length; i++) {
            action.conditions.push(conditions[i]);
        }
        
        userActions[msg.sender].push(id);
        
        emit ConditionCreated(id, msg.sender, conditions.length);
    }
    
    /**
     * @notice Execute a conditional action if all conditions are met
     * @param id Action ID
     */
    function executeAction(bytes32 id) external returns (bytes memory result) {
        ConditionalAction storage action = actions[id];
        
        if (action.creator == address(0)) revert TC_InvalidCondition();
        if (action.executed) revert TC_AlreadyExecuted();
        if (action.cancelled) revert TC_InvalidCondition();
        if (block.timestamp > action.expiresAt) {
            emit ConditionExpired(id);
            revert TC_Expired();
        }
        
        // Check ALL conditions
        if (!_checkAllConditions(action.conditions, action.creator, msg.sender)) {
            revert TC_ConditionNotMet();
        }
        
        action.executed = true;
        
        // Execute the action
        (bool success, bytes memory data) = action.target.call{value: action.value}(action.data);
        require(success, "TC: action failed");
        
        emit ConditionExecuted(id, msg.sender);
        return data;
    }
    
    /**
     * @notice Cancel a pending conditional action (creator only)
     */
    function cancelAction(bytes32 id) external {
        ConditionalAction storage action = actions[id];
        if (action.creator != msg.sender) revert TC_NotAuthorized();
        if (action.executed || action.cancelled) revert TC_InvalidCondition();
        
        action.cancelled = true;
        
        // Refund any ETH
        if (action.value > 0) {
            payable(msg.sender).transfer(action.value);
        }
        
        emit ConditionCancelled(id);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                         CONDITION CHECKING
    // ═══════════════════════════════════════════════════════════════════════
    
    function _checkAllConditions(
        Condition[] storage conditions,
        address creator,
        address executor
    ) internal view returns (bool) {
        for (uint256 i = 0; i < conditions.length; i++) {
            bool met = _checkCondition(conditions[i], creator, executor);
            if (conditions[i].inverted) met = !met;
            if (!met) return false;
        }
        return true;
    }
    
    function _checkCondition(
        Condition storage condition,
        address creator,
        address executor
    ) internal view returns (bool) {
        address target = condition.targetUser == address(0) ? executor : condition.targetUser;
        
        if (condition.conditionType == ConditionType.SCORE_MINIMUM) {
            return seer.getScore(target) >= condition.value;
        }
        
        if (condition.conditionType == ConditionType.SCORE_MAXIMUM) {
            return seer.getScore(target) <= condition.value;
        }
        
        if (condition.conditionType == ConditionType.ENDORSEMENT_COUNT) {
            return seer.getEndorsementCount(target) >= condition.value;
        }
        
        if (condition.conditionType == ConditionType.NO_DISPUTE_LOSSES) {
            return seer.getDisputeLosses(target) == 0;
        }
        
        if (condition.conditionType == ConditionType.TRANSACTION_COUNT) {
            return seer.getTransactionCount(target) >= condition.value;
        }
        
        if (condition.conditionType == ConditionType.MUTUAL_SCORE) {
            return seer.getScore(creator) >= condition.value && 
                   seer.getScore(executor) >= condition.value;
        }
        
        if (condition.conditionType == ConditionType.SCORE_DIFFERENCE) {
            uint256 s1 = seer.getScore(creator);
            uint256 s2 = seer.getScore(executor);
            uint256 diff = s1 > s2 ? s1 - s2 : s2 - s1;
            return diff <= condition.value;
        }
        
        if (condition.conditionType == ConditionType.COMBINED_SCORE) {
            return seer.getScore(creator) + seer.getScore(executor) >= condition.value;
        }
        
        if (condition.conditionType == ConditionType.TIME_LOCKED) {
            return block.timestamp >= condition.value;
        }
        
        // ENDORSEMENT_MUTUAL requires custom implementation in Seer
        
        return false;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if conditions would be met for an action
     */
    function wouldConditionsBeMet(bytes32 id, address executor) external view returns (bool) {
        ConditionalAction storage action = actions[id];
        if (action.creator == address(0) || action.executed || action.cancelled) return false;
        if (block.timestamp > action.expiresAt) return false;
        return _checkAllConditions(action.conditions, action.creator, executor);
    }
    
    /**
     * @notice Get action details
     */
    function getAction(bytes32 id) external view returns (
        address creator,
        address target,
        uint256 value,
        uint64 expiresAt,
        bool executed,
        bool cancelled,
        uint256 conditionCount
    ) {
        ConditionalAction storage action = actions[id];
        return (
            action.creator,
            action.target,
            action.value,
            action.expiresAt,
            action.executed,
            action.cancelled,
            action.conditions.length
        );
    }
    
    /**
     * @notice Get user's action IDs
     */
    function getUserActions(address user) external view returns (bytes32[] memory) {
        return userActions[user];
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    //                              ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    
    function setSeer(address _seer) external onlyDAO {
        require(_seer != address(0), "TC: zero address");
        seer = ISeer(_seer);
    }
    
    function setDAO(address _dao) external onlyDAO {
        require(_dao != address(0), "TC: zero address");
        dao = _dao;
    }
}
