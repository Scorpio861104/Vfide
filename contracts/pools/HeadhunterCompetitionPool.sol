// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../ServicePool.sol";

/// @title HeadhunterCompetitionPool — Monthly competition for user acquisition
/// @notice Headhunters earn score for verified referrals.
contract HeadhunterCompetitionPool is ServicePool {
    uint256 public constant MAX_HEADHUNTERS = 200;

    mapping(address => address) public referredBy;
    mapping(address => bool) public isQualifiedReferral;
    mapping(address => uint256) public referralCount;

    mapping(uint256 => mapping(address => uint256)) public periodReferrals;
    mapping(uint256 => uint256) public periodTotalReferrals;

    event ReferralRegistered(address indexed newUser, address indexed headhunter);
    event ReferralQualified(
        uint256 indexed period,
        address indexed newUser,
        address indexed headhunter
    );

    error AlreadyReferred();
    error SelfReferral();
    error NotReferred();
    error AlreadyQualified();

    constructor(
        address _token,
        address _admin,
        uint256 _maxPayoutPerPeriod
    ) ServicePool(_token, _admin, MAX_HEADHUNTERS, _maxPayoutPerPeriod) {}

    function registerReferral(
        address newUser,
        address headhunter
    ) external onlyRole(RECORDER_ROLE) nonReentrant {
        if (newUser == address(0) || headhunter == address(0)) revert ZeroAddress();
        if (newUser == headhunter) revert SelfReferral();
        if (referredBy[newUser] != address(0)) revert AlreadyReferred();

        referredBy[newUser] = headhunter;
        emit ReferralRegistered(newUser, headhunter);
    }

    function qualifyReferral(address newUser) external onlyRole(RECORDER_ROLE) nonReentrant {
        if (newUser == address(0)) revert ZeroAddress();
        address headhunter = referredBy[newUser];
        if (headhunter == address(0)) revert NotReferred();
        if (isQualifiedReferral[newUser]) revert AlreadyQualified();

        isQualifiedReferral[newUser] = true;
        referralCount[headhunter] += 1;

        _recordContribution(headhunter, 1);
        periodReferrals[currentPeriod][headhunter] += 1;
        periodTotalReferrals[currentPeriod] += 1;

        emit ReferralQualified(currentPeriod, newUser, headhunter);
    }

    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }

    function getPeriodReferrals(uint256 period, address headhunter) external view returns (uint256) {
        return periodReferrals[period][headhunter];
    }
}