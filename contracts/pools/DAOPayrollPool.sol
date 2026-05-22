// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../ServicePool.sol";

/// @title DAOPayrollPool — Monthly governance compensation for DAO members
/// @notice Each governance action (vote, review, discussion) earns points and
///         the period pool is split pro-rata to contributions.
/// @author Vfide
contract DAOPayrollPool is ServicePool {
    /// @notice MIN_DAO_MEMBERS_CAP
    uint256 public constant MIN_DAO_MEMBERS_CAP = 3;
    /// @notice MAX_DAO_MEMBERS_CAP
    uint256 public constant MAX_DAO_MEMBERS_CAP = 500;

    /// @notice DAOMemberCapUpdated
    /// @param oldCap oldCap
    /// @param newCap newCap
    event DAOMemberCapUpdated(uint256 oldCap, uint256 newCap);

    /// @notice constructor
    /// @param _token _token
    /// @param _admin _admin
    /// @param _initialMaxMembers _initialMaxMembers
    /// @param _maxPayoutPerPeriod _maxPayoutPerPeriod
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

    /// @notice setMaxParticipants
    /// @param _max _max
    function setMaxParticipants(uint256 _max) external override onlyRole(ADMIN_ROLE) {
        require(_max >= MIN_DAO_MEMBERS_CAP, "DAOPayrollPool: below minimum cap");
        require(_max <= MAX_DAO_MEMBERS_CAP, "DAOPayrollPool: above maximum cap");
        uint256 old = maxParticipants;
        maxParticipants = _max;
        emit DAOMemberCapUpdated(old, _max);
    }

    /// @notice recordVote
    /// @param member member
    function recordVote(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 1);
    }

    /// @notice recordReview
    /// @param member member
    function recordReview(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 2);
    }

    /// @notice recordDiscussion
    /// @param member member
    function recordDiscussion(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 1);
    }

    /// @notice recordAttendance
    /// @param member member
    function recordAttendance(address member) external onlyRole(RECORDER_ROLE) nonReentrant {
        _recordContribution(member, 1);
    }

    /// @notice batchRecordVotes
    /// @param members members
    function batchRecordVotes(address[] calldata members) external onlyRole(RECORDER_ROLE) nonReentrant {
        uint256 len = members.length;
        require(len <= maxParticipants, "Exceeds max members");
        for (uint256 i = 0; i < len;) {
            if (members[i] != address(0)) {
                _recordContribution(members[i], 1);
            }
            unchecked {
                ++i;
            }
        }
    }

    /// @notice grantRecorder
    /// @param recorder recorder
    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }
}