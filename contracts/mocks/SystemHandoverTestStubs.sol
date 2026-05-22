// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice SHDAOAdminStub
/// @title SHDAOAdminStub
/// @author Vfide
contract SHDAOAdminStub {
    /// @notice admin
    address public admin;

    /// @notice setAdmin
    /// @param _admin _admin
    function setAdmin(address _admin) external {
        admin = _admin;
    }
}

/// @notice SHTimelockAdminStub
/// @title SHTimelockAdminStub
/// @author Vfide
contract SHTimelockAdminStub {
    /// @notice admin
    address public admin;

    /// @notice setAdmin
    /// @param _admin _admin
    function setAdmin(address _admin) external {
        admin = _admin;
    }
}

/// @notice SHDAOOnlyTimelockStub
/// @title SHDAOOnlyTimelockStub
/// @author Vfide
contract SHDAOOnlyTimelockStub {
    /// @notice admin
    address public admin;
    /// @notice timelock
    address public timelock;

    /// @notice constructor
    /// @param _admin _admin
    /// @param _timelock _timelock
    constructor(address _admin, address _timelock) {
        admin = _admin;
        timelock = _timelock;
    }

    /// @notice setAdmin
    /// @param _admin _admin
    function setAdmin(address _admin) external {
        require(msg.sender == timelock, "DAO: only timelock");
        admin = _admin;
    }
}

/// @notice SHTimelockOnlySelfStub
/// @title SHTimelockOnlySelfStub
/// @author Vfide
contract SHTimelockOnlySelfStub {
    /// @notice admin
    address public admin;

    /// @notice constructor
    /// @param _admin _admin
    constructor(address _admin) {
        admin = _admin;
    }

    /// @notice setAdmin
    /// @param _admin _admin
    function setAdmin(address _admin) external {
        require(msg.sender == address(this), "TL: only self");
        admin = _admin;
    }
}

/// @notice SHSeerStub
/// @title SHSeerStub
/// @author Vfide
contract SHSeerStub {
    /// @notice scores
    mapping(address => uint16) public scores;
    /// @notice minGov
    uint16 public minGov = 5600;

    /// @notice setScore
    /// @param who who
    /// @param score score
    function setScore(address who, uint16 score) external {
        scores[who] = score;
    }

    /// @notice minForGovernance
    /// @return _uint16 _uint16
    function minForGovernance() external view returns (uint16) {
        return minGov;
    }

    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16) {
        return scores[subject];
    }
}

/// @notice SHCouncilElectionStub
/// @title SHCouncilElectionStub
/// @author Vfide
contract SHCouncilElectionStub {
    /// @notice members
    address[] public members;

    /// @notice setMembers
    /// @param _members _members
    function setMembers(address[] calldata _members) external {
        delete members;
        for (uint256 i = 0; i < _members.length; ++i) {
            members.push(_members[i]);
        }
    }

    /// @notice getActualCouncilSize
    /// @return _uint256 _uint256
    function getActualCouncilSize() external view returns (uint256) {
        return members.length;
    }

    /// @notice getCouncilMember
    /// @param index index
    /// @return _address _address
    function getCouncilMember(uint256 index) external view returns (address) {
        if (index >= members.length) return address(0);
        return members[index];
    }
}
