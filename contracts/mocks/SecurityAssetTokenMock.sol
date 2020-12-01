pragma solidity >=0.6.0 <0.7.0;

import "../interfaces/ISecurityAssetToken.sol";


/**
 * @title ISecurityAssetToken
 * @dev SecurityAssetToken interface
 */
contract SecurityAssetTokenMock is ISecurityAssetToken {

    event MintInvoked(address to, uint256 value, uint256 maturity);
    event BurnInvoked(uint256 tokenId);
    event TransferInvoked(address from, address to, uint256 tokenId);

    function mint(
        address to,
        uint256 value,
        uint256 maturity
    ) external override
    {
        emit MintInvoked(to, value, maturity);
    }

    function burn(uint256 tokenId) external override {
        emit BurnInvoked(tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external override
    {
        emit TransferInvoked(from, to, tokenId);
    }
}
