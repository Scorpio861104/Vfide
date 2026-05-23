// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ServicePool} from "../ServicePool.sol";

/// @title HeadhunterCompetitionPool — Monthly competition for user acquisition
/// @notice Headhunters earn score for verified referrals.
/// @author Vfide
contract HeadhunterCompetitionPool is ServicePool {
    /// @notice MAX_HEADHUNTERS
    uint256 public constant MAX_HEADHUNTERS = 200;

    /// @notice referredBy
    mapping(address => address) public referredBy;
    /// @notice isQualifiedReferral
    mapping(address => bool) public isQualifiedReferral;
    /// @notice referralCount
    mapping(address => uint256) public referralCount;

    /// @notice periodReferrals
    mapping(uint256 => mapping(address => uint256)) public periodReferrals;
    /// @notice periodTotalReferrals
    mapping(uint256 => uint256) public periodTotalReferrals;

    /// @notice ReferralRegistered
    /// @param newUser newUser
    /// @param headhunter headhunter
    event ReferralRegistered(address indexed newUser, address indexed headhunter);
    /// @notice ReferralQualified
    /// @param period period
    /// @param newUser newUser
    /// @param headhunter headhunter
    event ReferralQualified(uint256 indexed period, address indexed newUser, address indexed headhunter);

    /// @notice AlreadyReferred
    error AlreadyReferred();
    /// @notice SelfReferral
    error SelfReferral();
    /// @notice NotReferred
    error NotReferred();
    /// @notice AlreadyQualified
    error AlreadyQualified();

    /// @notice constructor
    /// @param _token _token
    /// @param _admin _admin
    /// @param _maxPayoutPerPeriod _maxPayoutPerPeriod
    constructor(address _token, address _admin, uint256 _maxPayoutPerPeriod) ServicePool(_token, _admin, MAX_HEADHUNTERS, _maxPayoutPerPeriod) {}

    /// @notice registerReferral
    /// @param newUser newUser
    /// @param headhunter headhunter
    function registerReferral(address newUser, address headhunter) external onlyRole(RECORDER_ROLE) nonReentrant {
        if (newUser == address(0) || headhunter == address(0)) revert ZeroAddress();
        if (newUser == headhunter) revert SelfReferral();
        if (referredBy[newUser] != address(0)) revert AlreadyReferred();

        referredBy[newUser] = headhunter;
        emit ReferralRegistered(newUser, headhunter);
    }

    /// @notice qualifyReferral
    /// @param newUser newUser
    function qualifyReferral(address newUser) external onlyRole(RECORDER_ROLE) nonReentrant {
        if (newUser == address(0)) revert ZeroAddress();
        address headhunter = referredBy[newUser];
        if (headhunter == address(0)) revert NotReferred();
        if (isQualifiedReferral[newUser]) revert AlreadyQualified();

        isQualifiedReferral[newUser] = true;
        ++referralCount[headhunter];

        _recordContribution(headhunter, 1);
        ++periodReferrals[currentPeriod][headhunter];
        ++periodTotalReferrals[currentPeriod];

        emit ReferralQualified(currentPeriod, newUser, headhunter);
    }

    /// @notice grantRecorder
    /// @param recorder recorder
    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }

    /// @notice getPeriodReferrals
    /// @param period period
    /// @param headhunter headhunter
    /// @return _uint256 _uint256
    function getPeriodReferrals(uint256 period, address headhunter) external view returns (uint256) {
        return periodReferrals[period][headhunter];
    }
}
