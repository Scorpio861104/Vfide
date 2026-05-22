// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ServicePool} from "../ServicePool.sol";

/// @notice IMerchantPortalVolume
/// @title IMerchantPortalVolume
/// @author Vfide
interface IMerchantPortalVolume {
    /// @notice getMerchantStats
    /// @param merchant merchant
    /// @return registered registered
    /// @return suspended suspended
    /// @return totalVolume totalVolume
    /// @return txCount txCount
    /// @return avgTxSize avgTxSize
    /// @return trustScore trustScore
    function getMerchantStats(
        address merchant
    )
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
/// @author Vfide
contract MerchantCompetitionPool is ServicePool {
    /// @notice MAX_MERCHANTS
    uint256 public constant MAX_MERCHANTS = 500;

    /// @notice minTransactionSize
    uint256 public minTransactionSize;
    /// @notice merchantPortal
    IMerchantPortalVolume public merchantPortal;
    /// @notice lastRecordedTotalVolume
    mapping(address => uint256) public lastRecordedTotalVolume;
    /// @notice merchantVolume
    mapping(uint256 => mapping(address => uint256)) public merchantVolume;
    /// @notice periodTotalVolume
    mapping(uint256 => uint256) public periodTotalVolume;

    /// @notice MerchantTransactionRecorded
    /// @param period period
    /// @param merchant merchant
    /// @param volume volume
    /// @param periodTotal periodTotal
    event MerchantTransactionRecorded(
        uint256 indexed period,
        address indexed merchant,
        uint256 volume,
        uint256 periodTotal
    );
    /// @notice MerchantPortalSet
    /// @param portal portal
    event MerchantPortalSet(address indexed portal);

    /// @notice constructor
    /// @param _token _token
    /// @param _admin _admin
    /// @param _maxPayoutPerPeriod _maxPayoutPerPeriod
    /// @param _minTransactionSize _minTransactionSize
    constructor(
        address _token,
        address _admin,
        uint256 _maxPayoutPerPeriod,
        uint256 _minTransactionSize
    ) ServicePool(_token, _admin, MAX_MERCHANTS, _maxPayoutPerPeriod) {
        minTransactionSize = _minTransactionSize;
    }

    /// @notice recordTransaction
    /// @param merchant merchant
    /// @param volumeUsd volumeUsd
    function recordTransaction(
        address merchant,
        uint256 volumeUsd
    ) external onlyRole(RECORDER_ROLE) nonReentrant {
        require(address(merchantPortal) != address(0), "Merchant portal not configured");

        (, , uint256 totalVolume, , , ) = merchantPortal.getMerchantStats(merchant);
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

        emit MerchantTransactionRecorded(
            currentPeriod,
            merchant,
            volumeUsd,
            periodTotalVolume[currentPeriod]
        );
    }

    /// @notice setMinTransactionSize
    /// @param _min _min
    function setMinTransactionSize(uint256 _min) external onlyRole(ADMIN_ROLE) nonReentrant {
        minTransactionSize = _min;
    }

    /// @notice setMerchantPortal
    /// @param portal portal
    function setMerchantPortal(address portal) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(portal != address(0), "Zero address");
        merchantPortal = IMerchantPortalVolume(portal);
        emit MerchantPortalSet(portal);
    }

    /// @notice grantRecorder
    /// @param recorder recorder
    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }

    /// @notice getMerchantVolume
    /// @param period period
    /// @param merchant merchant
    /// @return _uint256 _uint256
    function getMerchantVolume(uint256 period, address merchant) external view returns (uint256) {
        return merchantVolume[period][merchant];
    }
}
