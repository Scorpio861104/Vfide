// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @dev Minimal placeholder contract — satisfies extcodesize > 0 checks.
contract Placeholder {}

/// @dev Minimal ERC20 stub that returns true for transfer (satisfies IERC20).
contract TokenStub {
    function transfer(address, uint256) external pure returns (bool) { return true; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return true; }
    function balanceOf(address) external pure returns (uint256) { return 1e18; }
    function allowance(address, address) external pure returns (uint256) { return type(uint256).max; }
    function approve(address, uint256) external pure returns (bool) { return true; }
}

/// @dev Minimal presale stub — satisfies extcodesize > 0 + IPresaleStart interface.
contract PresaleStub {
    uint256 public saleStartTime;
    constructor() { saleStartTime = block.timestamp; }
}

/// @dev Minimal IVaultHub stub — returns a fixed vault address for any owner.
contract VaultHubStub {
    mapping(address => address) public vaults;

    function setVault(address owner, address vault) external {
        vaults[owner] = vault;
    }

    // VaultHub.vaultOf() signature used by PanicGuard
    function vaultOf(address owner) external view returns (address) {
        return vaults[owner];
    }
}

/// @dev Minimal ICouncilElection stub — controller can mark addresses as council.
contract CouncilStub {
    mapping(address => bool) public councilMembers;

    function addCouncilMember(address member) external {
        councilMembers[member] = true;
    }

    function isCouncil(address account) external view returns (bool) {
        return councilMembers[account];
    }

    // Satisfy full ICouncilElection interface
    function getCouncilMember(uint256) external pure returns (address) { return address(0); }
    function getActualCouncilSize() external pure returns (uint256) { return 0; }
    function removeCouncilMember(address, string calldata) external {}
}

/// @dev ISeerAutonomous stub that tries to call back into Seer to trigger circular delta guard.
interface ISeer_SetScore {
    function setScore(address subject, uint16 newScore, string calldata reason) external;
}

contract CircularSeerAttacker {
    address public seer;
    address public lastSubject;
    bool public callbackFired;
    bool public callbackReverted;

    function setSeer(address _seer) external { seer = _seer; }

    /// Called by Seer._delta cascade → tries to re-enter Seer for the same subject
    function onScoreChange(address subject, uint16, uint16) external {
        callbackFired = true;
        lastSubject = subject;
        // This call should revert with "SEER: circular delta" (M-18 Fix)
        try ISeer_SetScore(seer).setScore(subject, 5000, "reentrant") {
            // Should not reach here
        } catch {
            callbackReverted = true;
        }
    }
}
