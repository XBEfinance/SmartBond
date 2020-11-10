pragma solidity >= 0.6.0 < 0.7.0;

/**
 * @dev allows to mint bond token from SecurityAssetToken or miris account
 */
interface IBondNFToken {
    // TODO: maybe add method for checking token existence
    function mint(uint256 tokenId, address to, uint256 value, uint256 maturity) external;
    function burn(uint256 tokenId) external;
}
