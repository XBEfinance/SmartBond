pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/**
 * @title XBG
 * @dev xbg token
 */
contract XBG is ERC20 {
    constructor(
        uint256 initialSupply
    ) public ERC20("xbg", "xbg") {
        _mint(msg.sender, initialSupply);
    }
}