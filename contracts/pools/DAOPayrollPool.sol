// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../ServicePool.sol";

/// @title DAOPayrollPool — Monthly governance compensation for DAO members
/// @notice Each governance action (vote, review, discussion) earns points and
///         the period pool is split pro-rata to contributions.
contract DAOPayrollPool is ServicePool {
    uint256 public constant MIN_DAO_MEMBERS_CAP = 3;
    uint256 public constant MAX_DAO_MEMBERS_CAP = 500;

    event DAOMemberCapUpdated(uint256 oldCap, uint256 newCap);

    constructor(
        address _token,
        address _admin,
        uint256 _initialMaxMembers,
        uint256 _maxPayoutPerPeriod
    ) ServicePool(_token, _admin, _initialMaxMembers, _maxPayoutPerPeriod) {
        require(
            _initialMaxMembers >= MIN_DAO_MEMBERS_CAP && _initialMaxMembers <= MAX_DAO_MEMBERS_CAP,
            "DAOPayrollPool: initial cap out of bounds"
        );
    }

    function setMaxParticipants(uint256 _max) external override onlyRole(ADMIN_ROLE) {
        require(_max >= MIN_DAO_MEMBERS_CAP, "DAOPayrollPool: below minimum cap");
        require(_max <= MAX_DAO_MEMBERS_CAP, "DAOPayrollPool: above maximum cap");
        uint256 old = maxParticipants;
        maxParticipants = _max;
        emit DAOMemberCapUpdated(old, _max);
    }

    function recordVote(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 1);
    }

    function recordReview(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 2);
    }

    function recordDiscussion(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 1);
    }

    function recordAttendance(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 1);
    }

    function batchRecordVotes(address[] calldata members) external onlyRole(RECORDER_ROLE) nonReentrant {
        uint256 len = members.length;
        require(len <= maxParticipants, "Exceeds max members");
        for (uint256 i = 0; i < len;) {
            if (members[i] != address(0)) {
                _recordContribution(members[i], 1);
            }
            unchecked {
                i++;
            }
        }
    }

    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }
}