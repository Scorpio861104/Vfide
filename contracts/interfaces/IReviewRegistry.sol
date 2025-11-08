// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IReviewRegistry {
    struct Review {
        address reviewer;
        uint8   rating;
        bool    verified;
        uint64  time;
        bytes32 contentHash;
        uint16  reviewerScore;
    }

    function addReview(address merchantOwner, uint8 rating, bytes32 contentHash) external;
    function removeReview(address merchantOwner, uint256 idx, string calldata reason) external;
    function aggregate(address merchantOwner) external view returns (uint256 weightedX100, uint256 count, uint256 verifiedCount);
}