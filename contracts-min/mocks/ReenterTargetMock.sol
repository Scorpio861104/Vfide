// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract ReenterTargetMock {
    event Released(uint256 id, address caller);

    function release(uint256 id) external {
        emit Released(id, msg.sender);
    }
}
