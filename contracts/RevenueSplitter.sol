// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * RevenueSplitter — Treasury Management for Vfide
 * -----------------------------------------------
 * Allows merchants/DAOs to automatically split incoming revenue.
 * Example: 40% to Suppliers, 30% to Tax, 30% to Profit.
 * - Zero legal risk (just a routing tool).
 * - Safe against failed transfers (uses try/catch).
 */

import { IERC20, SafeERC20, ReentrancyGuard } from "./SharedInterfaces.sol";

contract RevenueSplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public owner;
    
    struct Payee {
        address account;
        uint256 shareBps; // Basis points (100 = 1%)
    }
    
    Payee[] public payees;
    uint256 public totalShares;

    event Distributed(address indexed token, uint256 totalAmount, uint256 payeesSucceeded, uint256 payeesFailed);
    event PayeeDistribution(address indexed payee, address indexed token, uint256 amount, bool success);

    constructor(address[] memory _accounts, uint256[] memory _shares) {
        require(_accounts.length == _shares.length, "length mismatch");
        require(_accounts.length > 0, "RS: no payees");
        require(msg.sender != address(0), "RS: zero owner");
        owner = msg.sender;
        
        uint256 length = _accounts.length;
        for (uint i = 0; i < length; ++i) {
            require(_accounts[i] != address(0), "zero address");
            require(_shares[i] > 0, "zero share");
            payees.push(Payee({account: _accounts[i], shareBps: _shares[i]}));
            totalShares += _shares[i];
        }
        require(totalShares == 10000, "must equal 100%");
    }

    // Anyone can trigger distribution of held tokens
    function distribute(address token) external nonReentrant {
        require(token != address(0), "RS: zero token");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "no funds");
        // Removed hardcoded 1e18 minimum - was breaking 6-decimal tokens like USDC

        uint256 distributed = 0;
        uint256 payeesSucceeded = 0;
        uint256 payeesFailed = 0;

        uint256 length = payees.length;
        for (uint i = 0; i < length; ++i) {
            uint256 amount;
            if (i == length - 1) {
                amount = balance - distributed; // Give remainder to last
            } else {
                amount = (balance * payees[i].shareBps) / 10000;
            }
            
            if (amount > 0) {
                distributed += amount;
                // C-12 Fix: Use SafeERC20 for safe transfers - reverts on failure
                // This ensures atomic distribution (all or nothing)
                IERC20(token).safeTransfer(payees[i].account, amount);
                payeesSucceeded++;
                emit PayeeDistribution(payees[i].account, token, amount, true);
            }
        }
        
        emit Distributed(token, balance, payeesSucceeded, payeesFailed);
    }
    
    function getPayees() external view returns (Payee[] memory) {
        return payees;
    }
}
