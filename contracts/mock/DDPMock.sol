pragma solidity >= 0.6.0 < 0.7.0;

import "../IDDP.sol";
import "../ERC721.sol";


contract DDPMock is IDDP, ERC721 {
    event DepositInvoked(uint256 tokenId, uint256 value, uint256 maturityEnds);

    constructor() ERC721("DDPMock", "DDP") public {}

    function deposit(uint256 tokenId, uint256 value, uint256 maturityEnds) external override {
        emit DepositInvoked(tokenId, value, maturityEnds);
    }
} 
