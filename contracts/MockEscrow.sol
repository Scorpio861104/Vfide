// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract MockEscrow {
	enum State { None, Initiated, Shipped, Delivered, Disputed, Released, Refunded }
	struct Order {
		address buyer;
		address merchant;
		uint256 amount;
		State state;
		uint64 tInitiated;
		uint64 tShipped;
		uint64 tDelivered;
		uint64 tDisputed;
		string meta;
	}
	mapping(uint256 => Order) private _orders;

	function setOrder(uint256 id, address buyer, address merchant, uint256 amount, uint8 state) external {
		_orders[id] = Order(buyer, merchant, amount, State(state), 0, 0, 0, 0, "");
	}
	function orders(uint256 id) external view returns (
		address, address, uint256, State, uint64, uint64, uint64, uint64, string memory
	) {
		Order storage o = _orders[id];
		return (o.buyer, o.merchant, o.amount, o.state, o.tInitiated, o.tShipped, o.tDelivered, o.tDisputed, o.meta);
	}
}
