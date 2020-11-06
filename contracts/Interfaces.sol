pragma solidity >= 0.6.0 < 0.7.0;


interface IBondNFT {
    function mint(address to, uint256 tokenId, uint256 value, uint256 maturity) external;
}
