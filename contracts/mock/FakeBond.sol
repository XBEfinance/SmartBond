pragma solidity >= 0.6.0 < 0.7.0;

import "../interfaces/IDDP.sol";

contract FakeBond {

    address private _ddp;
    constructor(address ddp) public {
        _ddp = ddp;
    }
    function callDdpDeposit(
        uint256 tokenId,
        uint256 value,
        uint256 maturity,
        address to) public {
            IDDP(_ddp).deposit(tokenId, value, maturity, to);
        }
}
