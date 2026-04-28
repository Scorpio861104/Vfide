// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../ServicePool.sol";

/// @title MerchantCompetitionPool — Monthly competition for merchant processors
/// @notice Merchants earn score based on settled transaction volume.
contract MerchantCompetitionPool is ServicePool {
    uint256 public constant MAX_MERCHANTS = 500;

    uint256 public minTransactionSize;
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

    function recordTransaction(
        address merchant,
        uint256 volumeUsd
    ) external onlyRole(RECORDER_ROLE) nonReentrant {
        require(volumeUsd >= minTransactionSize, "Below minimum transaction size");

        uint256 scorePoints = volumeUsd / 1e6;
        if (scorePoints == 0) scorePoints = 1;

        _recordContribution(merchant, scorePoints);
        merchantVolume[currentPeriod][merchant] += volumeUsd;
        periodTotalVolume[currentPeriod] += volumeUsd;

        emit MerchantTransactionRecorded(currentPeriod, merchant, volumeUsd, periodTotalVolume[currentPeriod]);
    }

    function setMinTransactionSize(uint256 _min) external onlyRole(ADMIN_ROLE) nonReentrant {
        minTransactionSize = _min;
    }

    function grantRecorder(address recorder) external onlyRole(ADMIN_ROLE) nonReentrant {
        _grantRole(RECORDER_ROLE, recorder);
    }

    function getMerchantVolume(uint256 period, address merchant) external view returns (uint256) {
        return merchantVolume[period][merchant];
    }
}