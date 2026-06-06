// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title CardBoundVaultIntents
/// @notice Shared EIP-712 intent struct definitions used by both CardBoundVault
///         (the caller) and CardBoundVaultIntentValidator (the validator).
/// @dev Defining the structs in a single file lets the vault pass intents directly
///      to the validator without re-constructing them field-by-field. Re-construction
///      adds ~50–100 bytes of memory-write bytecode per field per call site, which
///      defeated an earlier extraction attempt that pushed the vault over EIP-170.
library CardBoundVaultIntents {
    /// @notice Vault-to-vault transfer intent. Signed off-chain by the active wallet.
    struct TransferIntent {
        address vault;
        address toVault;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    /// @notice Merchant payment intent. Signed off-chain by the active wallet; submitted
    ///         on-chain by the merchant portal contract identified in `merchantPortal`.
    struct PayIntent {
        address vault;
        address merchantPortal;
        address token;
        address merchant;
        address recipient;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }

    /// @notice Atomic escrow funding intent. Signed off-chain by the active wallet;
    ///         submitted on-chain by the escrow contract identified in `escrowContract`.
    struct EscrowFundIntent {
        address vault;
        address escrowContract;
        uint256 escrowId;
        address token;
        uint256 amount;
        uint256 nonce;
        uint64 walletEpoch;
        uint64 deadline;
        uint256 chainId;
    }
}
