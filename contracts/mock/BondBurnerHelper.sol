pragma solidity >= 0.6.0 < 0.7.0;

import "../interfaces/IBondToken.sol";


/**
 * The only purpose of this contract is to ensure that
 * BondToken.burn() can be called only by DDP
 */
contract BondBurnerHelper {
    address private _bond;

    constructor(address bond) public {
        _bond = bond;
    }

    function burnToken(uint256 tokenId) external {
            IBondToken(_bond).burn(tokenId);
    }
}
