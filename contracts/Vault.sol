// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Vault is Ownable, Pausable {
    struct Guardian {
        address guardianAddress;
        bool hasApproved;
    }

    address public linkedWallet;
    mapping(address => Guardian) public guardians;
    address[] public guardianList;
    uint256 public approvalCount;
    address public pendingWallet;
    uint256 public recoveryDeadline;
    address public nextOfKin;
    uint256 public inactivityPeriod;
    uint256 public lastActivity;

    // Guardian Accountability: Add penalties for malicious or inactive guardians
    mapping(address => uint256) public guardianReputation;
    uint256 public constant REPUTATION_PENALTY = 10;

    // Guardian Rotation Mechanism
    uint256 public guardianRotationCooldown = 30 days;
    mapping(address => uint256) public lastGuardianRotation;

    // Fee Mechanism for Recovery
    uint256 public recoveryFee = 0.01 ether;

    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RecoveryInitiated(address indexed newWallet, uint256 deadline);
    event RecoveryApproved(address indexed guardian, address indexed newWallet);
    event RecoveryCompleted(address indexed oldWallet, address indexed newWallet);
    event NextOfKinSet(address indexed nextOfKin);
    event NextOfKinClaimed(address indexed nextOfKin, address indexed oldWallet);
    event NotificationSent(address indexed user, string message);

    modifier onlyGuardian() {
        require(guardians[msg.sender].guardianAddress != address(0), "Not a guardian");
        _;
    }

    modifier onlyNextOfKin() {
        require(msg.sender == nextOfKin, "Not the next of kin");
        _;
    }

    constructor(address _linkedWallet, address[] memory _guardians) {
        require(_guardians.length == 3, "Must have exactly 3 guardians");
        linkedWallet = _linkedWallet;
        for (uint256 i = 0; i < _guardians.length; i++) {
            guardians[_guardians[i]] = Guardian({guardianAddress: _guardians[i], hasApproved: false});
            guardianList.push(_guardians[i]);
            emit GuardianAdded(_guardians[i]);
        }
    }

    function initiateRecovery(address _newWallet) external payable onlyOwner whenNotPaused {
        payRecoveryFee();
        require(pendingWallet == address(0), "Recovery already in progress");
        pendingWallet = _newWallet;
        recoveryDeadline = block.timestamp + 7 days; // 7-day recovery period
        approvalCount = 0;
        for (uint256 i = 0; i < guardianList.length; i++) {
            guardians[guardianList[i]].hasApproved = false;
        }
        emit RecoveryInitiated(_newWallet, recoveryDeadline);
    }

    function approveRecovery() external onlyGuardian whenNotPaused {
        require(pendingWallet != address(0), "No recovery in progress");
        require(!guardians[msg.sender].hasApproved, "Already approved");
        guardians[msg.sender].hasApproved = true;
        approvalCount++;
        emit RecoveryApproved(msg.sender, pendingWallet);

        if (approvalCount >= 2) {
            completeRecovery();
        }
    }

    function completeRecovery() internal {
        require(block.timestamp <= recoveryDeadline, "Recovery deadline passed");
        address oldWallet = linkedWallet;
        linkedWallet = pendingWallet;
        pendingWallet = address(0);
        recoveryDeadline = 0;
        emit RecoveryCompleted(oldWallet, linkedWallet);
    }

    function addGuardian(address _newGuardian) external onlyOwner whenNotPaused {
        require(guardianList.length < 3, "Already 3 guardians");
        require(guardians[_newGuardian].guardianAddress == address(0), "Guardian already exists");
        guardians[_newGuardian] = Guardian({guardianAddress: _newGuardian, hasApproved: false});
        guardianList.push(_newGuardian);
        emit GuardianAdded(_newGuardian);
    }

    function removeGuardian(address _guardian) external onlyOwner whenNotPaused {
        require(guardians[_guardian].guardianAddress != address(0), "Not a guardian");
        delete guardians[_guardian];
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == _guardian) {
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                break;
            }
        }
        emit GuardianRemoved(_guardian);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setNextOfKin(address _nextOfKin) external onlyOwner whenNotPaused {
        nextOfKin = _nextOfKin;
        emit NextOfKinSet(_nextOfKin);
    }

    function updateActivity() external {
        require(msg.sender == linkedWallet, "Only linked wallet can update activity");
        lastActivity = block.timestamp;
    }

    // Customizable Inactivity Period
    function setInactivityPeriod(uint256 _period) external onlyOwner whenNotPaused {
        require(_period >= 30 days && _period <= 365 days, "Period must be between 30 and 365 days");
        inactivityPeriod = _period;
    }

    // Emergency Recovery Mechanism
    function emergencyRecovery(address _newWallet) external onlyOwner whenNotPaused {
        require(guardianList.length == 0, "Guardians still active");
        linkedWallet = _newWallet;
        emit RecoveryCompleted(address(0), _newWallet);
    }

    // Next of Kin Verification
    function claimAsNextOfKinWithVerification(bytes memory _proof) external onlyNextOfKin whenNotPaused {
        require(block.timestamp > lastActivity + inactivityPeriod, "Inactivity period not met");
        require(verifyProof(_proof), "Invalid proof");
        address oldWallet = linkedWallet;
        linkedWallet = nextOfKin;
        nextOfKin = address(0); // Reset next of kin after claim
        emit NextOfKinClaimed(msg.sender, oldWallet);
    }

    function verifyProof(bytes memory _proof) internal pure returns (bool) {
        // Placeholder for proof verification logic
        return true;
    }

    function penalizeGuardian(address _guardian) internal {
        require(guardians[_guardian].guardianAddress != address(0), "Not a guardian");
        guardianReputation[_guardian] -= REPUTATION_PENALTY;
    }

    function rotateGuardian(address _oldGuardian, address _newGuardian) external onlyOwner whenNotPaused {
        require(guardians[_oldGuardian].guardianAddress != address(0), "Not a guardian");
        require(guardians[_newGuardian].guardianAddress == address(0), "Already a guardian");
        require(block.timestamp >= lastGuardianRotation[_oldGuardian] + guardianRotationCooldown, "Cooldown not met");

        delete guardians[_oldGuardian];
        guardians[_newGuardian] = Guardian({guardianAddress: _newGuardian, hasApproved: false});
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == _oldGuardian) {
                guardianList[i] = _newGuardian;
                break;
            }
        }
        lastGuardianRotation[_newGuardian] = block.timestamp;
        emit GuardianRemoved(_oldGuardian);
        emit GuardianAdded(_newGuardian);
    }

    // Multi-Layered Recovery
    function multiLayeredRecovery(address _newWallet, bytes memory _daoApproval) external onlyOwner whenNotPaused {
        require(verifyDAOApproval(_daoApproval), "DAO approval required");
        linkedWallet = _newWallet;
        emit RecoveryCompleted(address(0), _newWallet);
    }

    function verifyDAOApproval(bytes memory _daoApproval) internal pure returns (bool) {
        // Placeholder for DAO approval verification logic
        return true;
    }

    function setRecoveryFee(uint256 _fee) external onlyOwner whenNotPaused {
        recoveryFee = _fee;
    }

    function payRecoveryFee() internal {
        require(msg.value >= recoveryFee, "Insufficient recovery fee");
    }

    function sendNotification(address _user, string memory _message) internal {
        emit NotificationSent(_user, _message);
    }
}