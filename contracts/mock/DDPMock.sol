pragma solidity >= 0.6.0 < 0.7.0;

import "../interfaces/IBondToken.sol";
import "../interfaces/IDDP.sol";
import "../ERC721.sol";


contract DDPMock is IDDP, ERC721 {
    event DepositInvoked(
        uint256 tokenId,
        uint256 value,
        uint256 maturityEnds,
        address to);

    address private _bond;

    constructor(address bond) ERC721("DDPMock", "DDP") public {
        _bond = bond;
    }

    function deposit(
        uint256 tokenId,
        uint256 value,
        uint256 maturityEnds,
        address to) external override 
    {
        emit DepositInvoked(
            tokenId,
            value,
            maturityEnds,
            to);
    }

    function burnToken(uint256 tokenId) external {
        IBondToken(_bond).burn(tokenId);
    }

    function callTransfer(address from, address to, uint256 tokenId) external {
       IBondToken(_bond).safeTransferFrom(from, to, tokenId);
    }
}
