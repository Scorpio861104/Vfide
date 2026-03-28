// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./ServicePool.sol";

// ═══════════════════════════════════════════════════════════════
// 1. DAO PAYROLL — 12 max members, equal scoring per governance action
// ═══════════════════════════════════════════════════════════════

/// @title DAOPayrollPool — Monthly governance compensation for up to 12 members
/// @notice Each governance action (vote, review, discussion) earns 1 point.
///         At period end, the pool is split proportional to points earned.
///         More work = bigger share. Zero work = zero pay.
///
///         The DAO always has at least 1 active member, so this pool always
///         distributes each period (unlike merchant/headhunter which may roll over).
///
///         Example: Pool has 90,000 VFIDE. 3 members scored 10, 20, 30 points.
///         Total = 60. Member A gets 10/60 = 15,000. B gets 20/60 = 30,000.
///         C gets 30/60 = 45,000. More active = bigger cut.
contract DAOPayrollPool is ServicePool {

    uint256 public constant MAX_DAO_MEMBERS = 12;

    constructor(
        address _token,
        address _admin,
        uint256 _maxPayoutPerPeriod
    ) ServicePool(_token, _admin, MAX_DAO_MEMBERS, _maxPayoutPerPeriod) {}

    /// @notice Record a governance vote. 1 point per vote.
    function recordVote(address member) external onlyRole(RECORDER_ROLE) {
        _recordContribution(member, 1);
    }

    /// @notice Record a proposal review. 2 points (more effort than voting).
    function recordReview(address member) external onlyRole(RECORDER_ROLE) {
        _recordContribution(member, 2);
    }

    /// @notice Record a substantive discussion post. 1 point.
    function recordDiscussion(address member) external onlyRole(RECORDER_ROLE) {
        _recordContribution(member, 1);
    }

    /// @notice Record governance session attendance. 1 point.
    function recordAttendance(address member) external onlyRole(RECORDER_ROLE) {
        _recordContribution(member, 1);
    }

    /// @notice Batch record votes for all voters on a proposal.
    function batchRecordVotes(address[] calldata members) external onlyRole(RECORDER_ROLE) {
        uint256 len = members.length;
        require(len <= MAX_DAO_MEMBERS, "Exceeds max members");
        for (uint256 i = 0; i < len;) {
            if (members[i] != address(0)) {
                _recordContribution(members[i], 1);
            }
            unchecked { i++; }
        }
    }

    /// @notice Grant the recorder role to DAO or Seer contract.
    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) {
        _grantRole(RECORDER_ROLE, recorder);
    }
}


// ═══════════════════════════════════════════════════════════════
// 2. MERCHANT COMPETITION — Score by transaction volume processed
// ═══════════════════════════════════════════════════════════════

/// @title MerchantCompetitionPool — Monthly competition for merchant processors
/// @notice Merchants earn score based on the USD value of transactions they
///         process through the VFIDE payment system. Bigger volume = bigger
///         share of the pool. This compensates merchants for bringing
///         real economic activity to the network.
///
///         ROLLOVER: If no merchants participate in a period, the fee revenue
///         accumulates in the contract. It stays until merchants compete for it.
///         This creates a natural incentive — a dormant pool grows larger,
///         attracting the first mover who claims the accumulated balance.
///
///         Example: Pool has 200,000 VFIDE. Merchant A processed $50K,
///         Merchant B processed $150K. Total = $200K.
///         A gets 50/200 = 50,000 VFIDE. B gets 150/200 = 150,000 VFIDE.
///
/// @dev HOWEY: Payment for transaction processing services rendered.
///      Score = volume processed, not tokens held. Pure work compensation.
contract MerchantCompetitionPool is ServicePool {

    uint256 public constant MAX_MERCHANTS = 500;

    // Minimum volume per transaction to count (prevents dust gaming)
    uint256 public minTransactionSize;

    // Per-period volume tracking for transparency
    mapping(uint256 => mapping(address => uint256)) public merchantVolume;
    mapping(uint256 => uint256) public periodTotalVolume;

    event MerchantTransactionRecorded(
        uint256 indexed period,
        address indexed merchant,
        uint256 volume,
        uint256 periodTotal
    );

    constructor(
        address _token,
        address _admin,
        uint256 _maxPayoutPerPeriod,
        uint256 _minTransactionSize
    ) ServicePool(_token, _admin, MAX_MERCHANTS, _maxPayoutPerPeriod) {
        minTransactionSize = _minTransactionSize;
    }

    /// @notice Record a merchant transaction settlement.
    ///         Called by MerchantPortal after payment settles.
    /// @param merchant Address of the merchant who processed the payment
    /// @param volumeUsd Transaction value in USD (6 decimals, like USDC)
    function recordTransaction(
        address merchant,
        uint256 volumeUsd
    ) external onlyRole(RECORDER_ROLE) {
        require(volumeUsd >= minTransactionSize, "Below minimum transaction size");

        // Score = volume in USD (so $1000 tx = 1000 points, $10 tx = 10 points)
        // Normalize to whole dollars to keep scores manageable
        uint256 scorePoints = volumeUsd / 1e6; // Convert 6-decimal USD to whole dollars
        if (scorePoints == 0) scorePoints = 1;  // Floor at 1 point

        _recordContribution(merchant, scorePoints);

        // Volume tracking uses currentPeriod which was already advanced by _recordContribution
        merchantVolume[currentPeriod][merchant] += volumeUsd;
        periodTotalVolume[currentPeriod] += volumeUsd;

        emit MerchantTransactionRecorded(currentPeriod, merchant, volumeUsd, periodTotalVolume[currentPeriod]);
    }

    /// @notice Update minimum transaction size.
    function setMinTransactionSize(uint256 _min) external onlyRole(ADMIN_ROLE) {
        minTransactionSize = _min;
    }

    /// @notice Grant recorder role to MerchantPortal contract.
    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) {
        _grantRole(RECORDER_ROLE, recorder);
    }

    /// @notice Get a merchant's volume for a period.
    function getMerchantVolume(uint256 period, address merchant) external view returns (uint256) {
        return merchantVolume[period][merchant];
    }
}


// ═══════════════════════════════════════════════════════════════
// 3. HEADHUNTER COMPETITION — Score by successful referrals
// ═══════════════════════════════════════════════════════════════

/// @title HeadhunterCompetitionPool — Monthly competition for user acquisition
/// @notice Headhunters (referrers) earn score for each new user they bring
///         who completes qualifying activity (first transaction, vault creation,
///         governance participation, etc.). More successful referrals = bigger
///         share of the pool.
///
///         ROLLOVER: If no headhunters refer users in a period, the fee revenue
///         accumulates. Months of unclaimed fees build up until someone competes.
///
///         Example: Pool has 100,000 VFIDE. Headhunter A referred 5 active users,
///         Headhunter B referred 15. Total = 20 referrals.
///         A gets 5/20 = 25,000 VFIDE. B gets 15/20 = 75,000 VFIDE.
///
/// @dev HOWEY: Payment for user acquisition services. Headhunters do real
///      outreach work. Score = verified referrals, not tokens held.
contract HeadhunterCompetitionPool is ServicePool {

    uint256 public constant MAX_HEADHUNTERS = 200;

    // Track referral relationships
    mapping(address => address) public referredBy;      // newUser => headhunter
    mapping(address => bool) public isQualifiedReferral; // Has the referral done qualifying activity?
    mapping(address => uint256) public referralCount;    // Headhunter => total qualified referrals

    // Per-period referral tracking
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

    /// @notice Register a referral relationship.
    ///         Called when a new user signs up with a referral code.
    /// @param newUser The new user being referred
    /// @param headhunter The person who referred them
    function registerReferral(
        address newUser,
        address headhunter
    ) external onlyRole(RECORDER_ROLE) {
        if (newUser == address(0) || headhunter == address(0)) revert ZeroAddress();
        if (newUser == headhunter) revert SelfReferral();
        if (referredBy[newUser] != address(0)) revert AlreadyReferred();

        referredBy[newUser] = headhunter;
        emit ReferralRegistered(newUser, headhunter);
    }

    /// @notice Mark a referral as qualified — the new user did real activity.
    ///         Called by Seer after verifying the new user completed their
    ///         first qualifying action (transaction, vault creation, vote, etc.)
    /// @param newUser The referred user who completed qualifying activity
    function qualifyReferral(address newUser) external onlyRole(RECORDER_ROLE) {
        if (newUser == address(0)) revert ZeroAddress();
        address headhunter = referredBy[newUser];
        if (headhunter == address(0)) revert NotReferred();
        if (isQualifiedReferral[newUser]) revert AlreadyQualified();

        isQualifiedReferral[newUser] = true;
        referralCount[headhunter] += 1;

        // 1 point per qualified referral
        _recordContribution(headhunter, 1);

        // Referral tracking uses currentPeriod which was already advanced by _recordContribution
        periodReferrals[currentPeriod][headhunter] += 1;
        periodTotalReferrals[currentPeriod] += 1;

        emit ReferralQualified(currentPeriod, newUser, headhunter);
    }

    /// @notice Grant recorder role to Seer or auth contract.
    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) {
        _grantRole(RECORDER_ROLE, recorder);
    }

    /// @notice Get a headhunter's referral count for a period.
    function getPeriodReferrals(uint256 period, address headhunter) external view returns (uint256) {
        return periodReferrals[period][headhunter];
    }
}
