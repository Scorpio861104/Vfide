// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../ServicePool.sol";

interface IMerchantPortalVolume {
    function getMerchantStats(address merchant)
        external
        view
        returns (
            bool registered,
            bool suspended,
            uint256 totalVolume,
            uint256 txCount,
            uint256 avgTxSize,
            uint16 trustScore
        );
}

/// @title MerchantCompetitionPool — Monthly competition for merchant processors
/// @notice Merchants earn score based on settled transaction volume.
contract MerchantCompetitionPool is ServicePool {
    uint256 public constant MAX_MERCHANTS = 500;

    uint256 public minTransactionSize;
    IMerchantPortalVolume public merchantPortal;
    mapping(address => uint256) public lastRecordedTotalVolume;
    mapping(uint256 => mapping(address => uint256)) public merchantVolume;
    mapping(uint256 => uint256) public periodTotalVolume;

    event MerchantTransactionRecorded(
        uint256 indexed period,
        address indexed merchant,
        uint256 volume,
        uint256 periodTotal
    );
    event MerchantPortalSet(address indexed portal);

    constructor(
        address _token,
        address _admin,
        uint256 _maxPayoutPerPeriod,
        uint256 _minTransactionSize
    ) ServicePool(_token, _admin, MAX_MERCHANTS, _maxPayoutPerPeriod) {
        minTransactionSize = _minTransactionSize;
    }

    function recordTransaction(
        address merchant,
        uint256 volumeUsd
    ) external onlyRole(RECORDER_ROLE) nonReentrant {
        require(address(merchantPortal) != address(0), "Merchant portal not configured");

        (, , uint256 totalVolume,,,) = merchantPortal.getMerchantStats(merchant);
        uint256 previousTotal = lastRecordedTotalVolume[merchant];
        require(totalVolume >= previousTotal, "Merchant volume decreased");

        uint256 onChainDelta = totalVolume - previousTotal;
        require(onChainDelta > 0, "No new merchant volume");
        require(volumeUsd == onChainDelta, "Reported volume mismatch");
        require(volumeUsd >= minTransactionSize, "Below minimum transaction size");

        uint256 scorePoints = volumeUsd / 1e6;
        if (scorePoints == 0) scorePoints = 1;

        lastRecordedTotalVolume[merchant] = totalVolume;
        _recordContribution(merchant, scorePoints);
        merchantVolume[currentPeriod][merchant] += volumeUsd;
        periodTotalVolume[currentPeriod] += volumeUsd;

        emit MerchantTransactionRecorded(currentPeriod, merchant, volumeUsd, periodTotalVolume[currentPeriod]);
    }

    function setMinTransactionSize(uint256 _min) external onlyRole(ADMIN_ROLE) nonReentrant {
        minTransactionSize = _min;
    }

    function setMerchantPortal(address portal) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(portal != address(0), "Zero address");
        merchantPortal = IMerchantPortalVolume(portal);
        emit MerchantPortalSet(portal);
    }

    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }

    function getMerchantVolume(uint256 period, address merchant) external view returns (uint256) {
        return merchantVolume[period][merchant];
    }
}