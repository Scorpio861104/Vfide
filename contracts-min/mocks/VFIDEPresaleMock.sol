// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract VFIDEPresaleMock {
    uint256 public presaleMinted;
    uint256 public constant PRESALE_SUPPLY_CAP = 75_000_000e18;
    
    event MintPresale(address to, uint256 amount);
    
    function mintPresale(address to, uint256 amount) external {
        presaleMinted += amount;
        emit MintPresale(to, amount);
    }
}
