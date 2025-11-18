// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IGovernanceHooks {
    function onProposalQueued(uint256 id, address target, uint256 value) external;
    function onVoteCast(uint256 id, address voter, bool support) external;
    function onFinalized(uint256 id, bool passed) external;
}