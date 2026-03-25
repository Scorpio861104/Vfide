// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockSeerAuto {
    mapping(address => uint16) private _score;

    uint16 public constant NEUTRAL = 5000;
    uint16 public lowTrustThreshold = 4000;
    uint16 public highTrustThreshold = 8000;
    uint16 public minForGovernance = 5400;

    function setScore(address subject, uint16 value) external {
        _score[subject] = value;
    }

    function getScore(address subject) external view returns (uint16) {
        uint16 s = _score[subject];
        return s == 0 ? NEUTRAL : s;
    }

    function punish(address subject, uint16 delta, string calldata) external {
        uint16 current = _score[subject];
        if (current == 0) current = NEUTRAL;
        _score[subject] = delta >= current ? 10 : current - delta;
    }

    function reward(address subject, uint16 delta, string calldata) external {
        uint16 current = _score[subject];
        if (current == 0) current = NEUTRAL;
        uint32 next = uint32(current) + uint32(delta);
        _score[subject] = next > 10000 ? 10000 : uint16(next);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //          EcosystemVault monitoring stubs (mirrors SeerAutonomous)
    // ─────────────────────────────────────────────────────────────────────────

    address public ecosystemVault;

    function setEcosystemVault(address _vault) external {
        ecosystemVault = _vault;
    }

    function monitorEcosystemVault() external returns (uint8) {
        return 0; // Mock: no actual vault calls
    }
}