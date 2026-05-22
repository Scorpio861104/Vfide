// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice MockSeerAuto
/// @title MockSeerAuto
/// @author Vfide
contract MockSeerAuto {
    /// @notice _score
    mapping(address => uint16) private _score;

    /// @notice NEUTRAL
    uint16 public constant NEUTRAL = 5000;
    /// @notice lowTrustThreshold
    uint16 public lowTrustThreshold = 4000;
    /// @notice highTrustThreshold
    uint16 public highTrustThreshold = 8000;
    /// @notice minForGovernance
    uint16 public minForGovernance = 5400;

    /// @notice setScore
    /// @param subject subject
    /// @param value value
    function setScore(address subject, uint16 value) external {
        _score[subject] = value;
    }

    /// @notice getScore
    /// @param subject subject
    /// @return _uint16 _uint16
    function getScore(address subject) external view returns (uint16) {
        uint16 s = _score[subject];
        return s == 0 ? NEUTRAL : s;
    }

    /// @notice punish
    /// @param subject subject
    /// @param delta delta
    /// @param _string _string
    function punish(address subject, uint16 delta, string calldata) external {
        uint16 current = _score[subject];
        if (current == 0) current = NEUTRAL;
        _score[subject] = delta >= current ? 10 : current - delta;
    }

    /// @notice reward
    /// @param subject subject
    /// @param delta delta
    /// @param _string _string
    function reward(address subject, uint16 delta, string calldata) external {
        uint16 current = _score[subject];
        if (current == 0) current = NEUTRAL;
        uint32 next = uint32(current) + uint32(delta);
        _score[subject] = next > 10000 ? 10000 : uint16(next);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //          EcosystemVault monitoring stubs (mirrors SeerAutonomous)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice ecosystemVault
    address public ecosystemVault;

    /// @notice setEcosystemVault
    /// @param _vault _vault
    function setEcosystemVault(address _vault) external {
        ecosystemVault = _vault;
    }

    /// @notice monitorEcosystemVault
    /// @return _uint8 _uint8
    function monitorEcosystemVault() external returns (uint8) {
        return 0; // Mock: no actual vault calls
    }
}