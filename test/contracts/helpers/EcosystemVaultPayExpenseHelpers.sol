// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../../../contracts/EcosystemVault.sol";
import "../../../contracts/SharedInterfaces.sol";

interface IEcosystemVaultOpsObserver {
    function operationsPool() external view returns (uint256);
}

contract EcosystemVaultTestable is EcosystemVault {
    constructor(address _vfide, address _seer, address _operationsWallet)
        EcosystemVault(_vfide, _seer, _operationsWallet)
    {}

    /// @dev Bypasses the onlyOwner gate for test harness — sets the sandwich-prevention floor.
    function forceMinOutputPerVfide(uint256 floorPrice) external {
        minOutputPerVfide = floorPrice;
    }
}

contract ObservedOpsToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public observedVault;
    uint256 public observedOperationsPool;
    bool private observing;

    function setObservedVault(address vault) external {
        observedVault = vault;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _observeVaultState();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        _observeVaultState();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function _observeVaultState() internal {
        if (!observing && observedVault != address(0) && msg.sender == observedVault) {
            observing = true;
            observedOperationsPool = IEcosystemVaultOpsObserver(observedVault).operationsPool();
            observing = false;
        }
    }
}

contract QuoteMockSwapRouter {
    function getAmountsOut(uint256 amountIn, address[] calldata) external pure returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).transfer(to, amountIn);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
    }
}

contract MockCouncilManager {
    address[] private activeMembers;

    function setActiveMembers(address[] calldata members) external {
        delete activeMembers;
        for (uint256 i = 0; i < members.length; i++) {
            activeMembers.push(members[i]);
        }
    }

    function getActiveMembers() external view returns (address[] memory) {
        return activeMembers;
    }
}