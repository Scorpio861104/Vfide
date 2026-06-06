// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {CardBoundVaultIntents} from "./CardBoundVaultIntents.sol";

/// @notice Vault hub interface for `isVault` lookup (intent target validation).
interface IVaultHubMinimal {
    function isVault(address vault) external view returns (bool);
}

/// @notice Subset of CardBoundVault's public getters that the validator reads back.
/// @dev All values are public state on the vault; no special access control needed.
///      Reading these via external calls keeps the per-call argument list small,
///      which minimizes the ABI-encoding overhead in the vault's call sites — the
///      whole point of extracting the validator was to shrink the vault's runtime
///      bytecode under EIP-170.
interface ICardBoundVaultStateForValidator {
    function hub() external view returns (address);
    function vfideToken() external view returns (address);
    function walletEpoch() external view returns (uint64);
    function nextNonce() external view returns (uint256);
    function maxPerTransfer() external view returns (uint256);
    function dailyTransferLimit() external view returns (uint256);
    function spentToday() external view returns (uint256);
    function domainSeparator() external view returns (bytes32);
}

/// @title CardBoundVaultIntentValidator
/// @notice External validator extracted from CardBoundVault to keep the vault under EIP-170.
///         Performs full validation, EIP-712 digest computation, and ECDSA signature
///         recovery for TransferIntent, PayIntent, and EscrowFundIntent. Reverts on any
///         validation failure; returns the recovered signer on success.
///
///         This is a stateless, view-only contract. Deploy once and reuse across all
///         vaults — the validator reads the vault's public state directly via the
///         caller (`msg.sender`) so the vault only has to pass (intent, signature, msg.sender).
///         Keeping the per-call argument list small minimizes ABI-encoding bytecode in
///         the vault's call sites.
contract CardBoundVaultIntentValidator {
    using CardBoundVaultIntents for *;

    // ── EIP-712 typehashes (must match CardBoundVault exactly) ─────────────────
    bytes32 private constant TRANSFER_INTENT_TYPEHASH =
        keccak256("TransferIntent(address vault,address toVault,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)");
    bytes32 private constant PAY_INTENT_TYPEHASH =
        keccak256("PayIntent(address vault,address merchantPortal,address token,address merchant,address recipient,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)");
    bytes32 private constant ESCROW_FUND_INTENT_TYPEHASH =
        keccak256("EscrowFundIntent(address vault,address escrowContract,uint256 escrowId,address token,uint256 amount,uint256 nonce,uint64 walletEpoch,uint64 deadline,uint256 chainId)");

    // ── ECDSA malleability guard ───────────────────────────────────────────────
    uint256 private constant ECDSA_S_UPPER_BOUND = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    // ── Errors (mirror CardBoundVault names so revert reasons match) ───────────
    error CBV_InvalidSignature();
    error CBV_InvalidChain();
    error CBV_InvalidEpoch();
    error CBV_Expired();
    error CBV_InvalidNonce();
    error CBV_NotVault();
    error CBV_TransferLimit();
    error CBV_DailyLimit();
    error CBV_PayIntentInvalid();
    error CBV_PayIntentTokenInvalid();

    // ──────────────────────────────────────────────────────────────────────────
    // External validators — read vault state from msg.sender (the calling vault)
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Validate a TransferIntent and recover its signer.
    /// @dev The calling vault is `msg.sender`. The validator reads all relevant
    ///      vault state directly (warm storage reads after the vault's own writes).
    ///      Reverts on any validation failure; returns the recovered signer on success.
    function validateTransfer(
        CardBoundVaultIntents.TransferIntent calldata intent,
        bytes calldata signature
    ) external view returns (address signer) {
        ICardBoundVaultStateForValidator vault = ICardBoundVaultStateForValidator(msg.sender);
        address vaultAddr = msg.sender;

        if (intent.vault != vaultAddr) revert CBV_InvalidSignature();
        if (
            intent.toVault == address(0)
                || intent.toVault == vaultAddr
                || intent.toVault == address(0x000000000000000000000000000000000000dEaD)
        ) revert CBV_NotVault();
        if (!IVaultHubMinimal(vault.hub()).isVault(intent.toVault)) revert CBV_NotVault();
        if (intent.chainId != block.chainid) revert CBV_InvalidChain();
        if (intent.walletEpoch != vault.walletEpoch()) revert CBV_InvalidEpoch();
        if (intent.deadline < block.timestamp) revert CBV_Expired();
        if (intent.nonce != vault.nextNonce()) revert CBV_InvalidNonce();

        uint256 amount = intent.amount;
        if (amount == 0 || amount > vault.maxPerTransfer()) revert CBV_TransferLimit();
        if (vault.spentToday() + amount > vault.dailyTransferLimit()) revert CBV_DailyLimit();

        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_INTENT_TYPEHASH,
                intent.vault,
                intent.toVault,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", vault.domainSeparator(), structHash));
        signer = _recoverSigner(digest, signature);
    }

    /// @notice Validate a PayIntent and recover its signer.
    /// @param msgSender The original caller of the vault's executePayMerchant (the merchant portal).
    function validatePay(
        CardBoundVaultIntents.PayIntent calldata intent,
        bytes calldata signature,
        address msgSender
    ) external view returns (address signer) {
        ICardBoundVaultStateForValidator vault = ICardBoundVaultStateForValidator(msg.sender);
        address vaultAddr = msg.sender;

        if (msgSender != intent.merchantPortal) revert CBV_PayIntentInvalid();
        if (intent.vault != vaultAddr) revert CBV_PayIntentInvalid();
        if (intent.merchantPortal == address(0)) revert CBV_PayIntentInvalid();
        if (intent.merchant == address(0)) revert CBV_PayIntentInvalid();
        if (intent.token != vault.vfideToken()) revert CBV_PayIntentTokenInvalid();
        if (intent.recipient == address(0) || intent.recipient == vaultAddr) revert CBV_PayIntentInvalid();
        if (intent.chainId != block.chainid) revert CBV_InvalidChain();
        if (intent.walletEpoch != vault.walletEpoch()) revert CBV_InvalidEpoch();
        if (intent.deadline < block.timestamp) revert CBV_Expired();
        if (intent.nonce != vault.nextNonce()) revert CBV_InvalidNonce();

        uint256 amount = intent.amount;
        if (amount == 0 || amount > vault.maxPerTransfer()) revert CBV_TransferLimit();
        if (vault.spentToday() + amount > vault.dailyTransferLimit()) revert CBV_DailyLimit();

        bytes32 structHash = keccak256(
            abi.encode(
                PAY_INTENT_TYPEHASH,
                intent.vault,
                intent.merchantPortal,
                intent.token,
                intent.merchant,
                intent.recipient,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", vault.domainSeparator(), structHash));
        signer = _recoverSigner(digest, signature);
    }

    /// @notice Validate an EscrowFundIntent and recover its signer.
    /// @param msgSender The original caller of the vault's executeFundEscrow (the escrow contract).
    function validateFundEscrow(
        CardBoundVaultIntents.EscrowFundIntent calldata intent,
        bytes calldata signature,
        address msgSender
    ) external view returns (address signer) {
        ICardBoundVaultStateForValidator vault = ICardBoundVaultStateForValidator(msg.sender);
        address vaultAddr = msg.sender;

        if (msgSender != intent.escrowContract) revert CBV_PayIntentInvalid();
        if (intent.vault != vaultAddr) revert CBV_PayIntentInvalid();
        if (intent.escrowContract == address(0)) revert CBV_PayIntentInvalid();
        if (intent.token != vault.vfideToken()) revert CBV_PayIntentTokenInvalid();
        if (intent.chainId != block.chainid) revert CBV_InvalidChain();
        if (intent.walletEpoch != vault.walletEpoch()) revert CBV_InvalidEpoch();
        if (intent.deadline < block.timestamp) revert CBV_Expired();
        if (intent.nonce != vault.nextNonce()) revert CBV_InvalidNonce();

        uint256 amount = intent.amount;
        if (amount == 0 || amount > vault.maxPerTransfer()) revert CBV_TransferLimit();
        if (vault.spentToday() + amount > vault.dailyTransferLimit()) revert CBV_DailyLimit();

        bytes32 structHash = keccak256(
            abi.encode(
                ESCROW_FUND_INTENT_TYPEHASH,
                intent.vault,
                intent.escrowContract,
                intent.escrowId,
                intent.token,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", vault.domainSeparator(), structHash));
        signer = _recoverSigner(digest, signature);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Public digest helpers (so vault's view-helpers can forward without dup)
    // ──────────────────────────────────────────────────────────────────────────

    function transferDigest(CardBoundVaultIntents.TransferIntent calldata intent, bytes32 domSep) external pure returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_INTENT_TYPEHASH,
                intent.vault,
                intent.toVault,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domSep, structHash));
    }

    function payDigest(CardBoundVaultIntents.PayIntent calldata intent, bytes32 domSep) external pure returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                PAY_INTENT_TYPEHASH,
                intent.vault,
                intent.merchantPortal,
                intent.token,
                intent.merchant,
                intent.recipient,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domSep, structHash));
    }

    function fundEscrowDigest(CardBoundVaultIntents.EscrowFundIntent calldata intent, bytes32 domSep) external pure returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ESCROW_FUND_INTENT_TYPEHASH,
                intent.vault,
                intent.escrowContract,
                intent.escrowId,
                intent.token,
                intent.amount,
                intent.nonce,
                intent.walletEpoch,
                intent.deadline,
                intent.chainId
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domSep, structHash));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ECDSA recovery (assembly-based, malleability-guarded)
    // ──────────────────────────────────────────────────────────────────────────

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert CBV_InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v != 27 && v != 28) revert CBV_InvalidSignature();
        if (uint256(s) > ECDSA_S_UPPER_BOUND) revert CBV_InvalidSignature();

        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert CBV_InvalidSignature();
        return recovered;
    }
}
