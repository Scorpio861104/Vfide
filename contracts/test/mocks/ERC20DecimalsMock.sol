// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./ERC20Mock.sol";

contract ERC20DecimalsMock is ERC20Mock {
    uint8 private _customDecimals;

    constructor(string memory _name, string memory _symbol, uint8 _dec) ERC20Mock(_name, _symbol) {
        _customDecimals = _dec;
    }

    function decimals() external view override returns (uint8) {
        return _customDecimals;
    }
}
