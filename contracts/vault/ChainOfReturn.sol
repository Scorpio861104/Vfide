// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.30;

/**
 * @title ChainOfReturn
 * @notice Multi-generation inheritance cascade for VFIDE (Backend Completion Campaign 13, Wave E — BUILT).
 *
 * GOAL. "To my children, and if a child predeceases me, to their children." If a designated heir cannot claim
 * (deceased / inactive when distribution opens), their share cascades to THAT heir's own pre-committed successors —
 * the next generation — recursively, up to a bounded depth.
 *
 * KEY SAFETY IDEA — pre-committed succession via MERKLE SETS. Each node commits to its successor SET as a MERKLE
 * ROOT (so a node can name MULTIPLE children). A node's leaf = keccak256(DOMAIN, basisPoints, secret, successorsRoot)
 * where successorsRoot is the merkle root of its children's leaves (0 for a leaf). A successor claims a cascaded
 * share by proving merkle-membership of its leaf within its parent's successorsRoot, level by level, down from the
 * deceased heir. Because every link is pre-committed by the ancestor, a share can ONLY reach the heir (if they
 * claim) or the heir's OWN committed descendants — never an arbitrary party. No one can fake a death to reroute.
 *
 * NON-CUSTODIAL INVARIANTS (by construction):
 *   • Never holds, moves, or seizes funds. A cascaded share is claimed by the successor with THEIR own secret; the
 *     manager transfers to the successor directly. This contract only RESOLVES who may claim.
 *   • A cascade link is honored only after the ancestor's claim window CLOSED without the ancestor claiming — never
 *     on a mere assertion of death.
 *   • Bounded depth (MAX_RETURN_DEPTH) prevents unbounded recursion / gas exhaustion.
 *   • Share conservation: a path's share is the PRODUCT of basisPoints down the path — a descendant can never
 *     receive more than its ancestor's share.
 *
 * The manager (CardBoundVaultInheritanceManager) stores each heir's successorsRoot at config time and routes a
 * post-window successor claim through `verifyReturnPath` + `computeCascadedBasisPoints`.
 */
contract ChainOfReturn {
    uint8 public constant MAX_RETURN_DEPTH = 3;          // heir's child = 1, grandchild = 2, great-grandchild = 3
    uint256 public constant TOTAL_BASIS_POINTS = 10000;
    bytes32 public constant RETURN_CHAIN_DOMAIN = keccak256("VFIDE_RETURN_CHAIN_V1");

    error COR_OnlyManager();
    error COR_DepthExceeded(uint256 depth);
    error COR_EmptyPath();
    error COR_AncestorClaimed();
    error COR_AncestorWindowOpen();
    error COR_BadLink(uint256 level);
    error COR_AlreadyClaimed();

    address public immutable manager;
    modifier onlyManager() { if (msg.sender != manager) revert COR_OnlyManager(); _; }

    mapping(uint256 => mapping(bytes32 => bool)) public cascadeClaimed; // claimNonce → leaf → claimed once

    event ReturnPathVerified(uint256 indexed claimNonce, bytes32 indexed leaf, uint256 depth, uint256 cascadedBps);

    constructor(address manager_) { require(manager_ != address(0), "COR: zero manager"); manager = manager_; }

    struct PathLink {
        uint256 basisPoints;     // share of the PARENT's share (1..10000)
        bytes32 secret;          // reveal secret
        bytes32 successorsRoot;  // merkle root of THIS node's successors (0 if leaf)
        bytes32[] proof;         // merkle proof of this node's leaf within its PARENT's successorsRoot
    }

    function nodeLeaf(uint256 basisPoints, bytes32 secret, bytes32 successorsRoot) public pure returns (bytes32) {
        return keccak256(abi.encode(RETURN_CHAIN_DOMAIN, basisPoints, secret, successorsRoot));
    }
    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a <= b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }
    function _merkleVerify(bytes32 leaf, bytes32[] memory proof, bytes32 root) private pure returns (bool) {
        bytes32 h = leaf;
        for (uint256 i = 0; i < proof.length; ++i) h = _hashPair(h, proof[i]);
        return h == root;
    }

    /**
     * Verify `path` is a valid succession chain from a heir whose committed successor root is `heirSuccessorsRoot`,
     * down to the claimant (the final link). Each link's leaf must merkle-verify within its parent's successor root.
     * Every ancestor's window must have CLOSED and no ancestor may have CLAIMED.
     */
    function verifyReturnPath(
        bytes32 heirSuccessorsRoot,
        PathLink[] calldata path,
        bool[] calldata ancestorsClaimed,
        bool[] calldata ancestorWindowsClosed
    ) public pure returns (bool) {
        uint256 n = path.length;
        if (n == 0) revert COR_EmptyPath();
        if (n > MAX_RETURN_DEPTH) revert COR_DepthExceeded(n);
        if (ancestorsClaimed.length != n || ancestorWindowsClosed.length != n) revert COR_BadLink(0);

        bytes32 parentRoot = heirSuccessorsRoot;
        for (uint256 i = 0; i < n; ++i) {
            if (!ancestorWindowsClosed[i]) revert COR_AncestorWindowOpen();
            if (ancestorsClaimed[i]) revert COR_AncestorClaimed();
            if (path[i].basisPoints == 0 || path[i].basisPoints > TOTAL_BASIS_POINTS) revert COR_BadLink(i);
            bytes32 leaf = nodeLeaf(path[i].basisPoints, path[i].secret, path[i].successorsRoot);
            if (!_merkleVerify(leaf, path[i].proof, parentRoot)) revert COR_BadLink(i);
            parentRoot = path[i].successorsRoot; // descend
        }
        return true;
    }

    /// Cascaded share (basis points of the WHOLE estate) = product of each link's basisPoints / 10000 per level.
    function computeCascadedBasisPoints(PathLink[] calldata path) public pure returns (uint256 bps) {
        bps = TOTAL_BASIS_POINTS;
        for (uint256 i = 0; i < path.length; ++i) bps = (bps * path[i].basisPoints) / TOTAL_BASIS_POINTS;
    }

    /// Manager entry: verify the path, mark the leaf claimed once, return cascaded bps. Manager transfers to the
    /// successor's own wallet (custody never touches this contract).
    function claimCascade(
        uint256 claimNonce,
        bytes32 heirSuccessorsRoot,
        PathLink[] calldata path,
        bool[] calldata ancestorsClaimed,
        bool[] calldata ancestorWindowsClosed
    ) external onlyManager returns (uint256 cascadedBps) {
        verifyReturnPath(heirSuccessorsRoot, path, ancestorsClaimed, ancestorWindowsClosed);
        bytes32 leaf = nodeLeaf(path[path.length - 1].basisPoints, path[path.length - 1].secret, path[path.length - 1].successorsRoot);
        if (cascadeClaimed[claimNonce][leaf]) revert COR_AlreadyClaimed();
        cascadeClaimed[claimNonce][leaf] = true;
        cascadedBps = computeCascadedBasisPoints(path);
        emit ReturnPathVerified(claimNonce, leaf, path.length, cascadedBps);
    }
}
