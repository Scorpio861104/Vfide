// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./SharedInterfaces.sol";

/**
 * @title TempVault
 * @notice Temporary holding vault for tokens with proper security controls
 * @dev Includes reentrancy protection, events, and owner transfer capability
 * 
 * WARNING: This is a simple vault intended for temporary holding only.
 * For production use, consider SanctumVault or EcosystemVault with multi-sig.
 */
contract TempVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public owner;
    address public pendingOwner;
    
    event Withdrawal(address indexed token, address indexed to, uint256 amount, address indexed by);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    error TV_NotOwner();
    error TV_NotPendingOwner();
    error TV_ZeroAddress();
    error TV_ZeroAmount();
    error TV_TransferFailed();
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert TV_NotOwner();
        _;
    }
    
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @notice Withdraw tokens to a specified address
     * @param token The ERC20 token address
     * @param to The recipient address
     * @param amount The amount to withdraw
     */
    function withdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert TV_ZeroAddress();
        if (amount == 0) revert TV_ZeroAmount();
        
        IERC20(token).safeTransfer(to, amount);
        
        emit Withdrawal(token, to, amount, msg.sender);
    }
    
    /**
     * @notice Start ownership transfer (two-step process)
     * @param newOwner The address to transfer ownership to
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert TV_ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }
    
    /**
     * @notice Accept ownership transfer (must be called by pending owner)
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert TV_NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
    
    /**
     * @notice Get token balance held by this vault
     * @param token The ERC20 token address
     * @return The balance of the specified token
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    /**
     * @notice Prevent accidental ETH sends
     */
    receive() external payable {
        revert("TempVault: ETH not accepted");
    }
}
