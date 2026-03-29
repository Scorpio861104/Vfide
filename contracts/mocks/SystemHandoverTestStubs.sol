// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract SHDAOAdminStub {
    address public admin;

    function setAdmin(address _admin) external {
        admin = _admin;
    }
}

contract SHTimelockAdminStub {
    address public admin;

    function setAdmin(address _admin) external {
        admin = _admin;
    }
}

contract SHSeerStub {
    mapping(address => uint16) public scores;
    uint16 public minGov = 5600;

    function setScore(address who, uint16 score) external {
        scores[who] = score;
    }

    function minForGovernance() external view returns (uint16) {
        return minGov;
    }

    function getScore(address subject) external view returns (uint16) {
        return scores[subject];
    }
}

contract SHCouncilElectionStub {
    address[] public members;

    function setMembers(address[] calldata _members) external {
        delete members;
        for (uint256 i = 0; i < _members.length; i++) {
            members.push(_members[i]);
        }
    }

    function getActualCouncilSize() external view returns (uint256) {
        return members.length;
    }

    function getCouncilMember(uint256 index) external view returns (address) {
        if (index >= members.length) return address(0);
        return members[index];
    }
}
