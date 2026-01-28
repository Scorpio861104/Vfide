// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract ReverterEscrow {
	event Released(uint256 id);
	event Refunded(uint256 id);

	bool public shouldRevert;

	function setRevert(bool v) external { shouldRevert = v; }

	function release(uint256 id) external {
		if (shouldRevert) revert("revert-release");
		emit Released(id);
	}

	function refund(uint256 id) external {
		if (shouldRevert) revert("revert-refund");
		emit Refunded(id);
	}
}
