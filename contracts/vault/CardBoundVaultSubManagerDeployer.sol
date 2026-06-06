// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {CardBoundVaultPaymentQueueManager}    from "./CardBoundVaultPaymentQueueManager.sol";
import {CardBoundVaultWithdrawalQueueManager} from "./CardBoundVaultWithdrawalQueueManager.sol";
import {CardBoundVaultInheritanceManager}     from "./CardBoundVaultInheritanceManager.sol";
import {CardBoundVaultAdminManager}           from "./CardBoundVaultAdminManager.sol";

/// @notice Deploys the four CardBoundVault sub-managers for a given vault address.
///         Separated from CardBoundVaultDeployer so that neither contract embeds
///         the other's initcode, keeping both under the Prague 49152-byte limit.
/// @title  CardBoundVaultSubManagerDeployer
/// @author Vfide
contract CardBoundVaultSubManagerDeployer {
    /// @notice Deploy all four sub-managers wired to `vaultAddr`.
    /// @param  vaultAddr   The vault that will own the managers (predicted address).
    /// @param  dailyLimit  Used to set the initial payment threshold (5 x dailyLimit).
    /// @return pm  CardBoundVaultPaymentQueueManager address
    /// @return wq  CardBoundVaultWithdrawalQueueManager address
    /// @return im  CardBoundVaultInheritanceManager address
    /// @return am  CardBoundVaultAdminManager address
    function deployManagers(address vaultAddr, uint256 dailyLimit)
        external
        returns (address pm, address wq, address im, address am)
    {
        pm = address(new CardBoundVaultPaymentQueueManager(vaultAddr, dailyLimit * 5));
        wq = address(new CardBoundVaultWithdrawalQueueManager(vaultAddr));
        im = address(new CardBoundVaultInheritanceManager(vaultAddr));
        am = address(new CardBoundVaultAdminManager(vaultAddr));
    }
}
