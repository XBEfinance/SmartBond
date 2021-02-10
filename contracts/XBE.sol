pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


/**
 * @title XBE
 * @dev xbe token
 */
contract XBE is ERC20 {
    constructor(
        uint256 initialSupply
    ) public ERC20("XBE", "XBE") {
        _mint(msg.sender, initialSupply);
    }
}
