pragma solidity >= 0.6.0 < 0.7.0;

import "../IBondToken.sol";
import "../ERC721.sol";


/**
 * @dev mock for BondNFToken. Allows to check for bond token existance and
 * creation
 */
contract NFBondTokenMock is IBondNFToken, ERC721 {
    struct TokenInfo {
        bool isMinted;
        address to;
        uint256 value;
        uint256 maturity;
    }

    mapping(uint256 => TokenInfo) private _tokens;

    function hasToken(uint256 tokenId) external view override returns(bool) {
        return _tokens[tokenId].isMinted;
    }

    function mint(
        uint256 tokenId,
        address to,
        uint256 value,
        uint256 maturity) external override
    {
        require(!_tokens[tokenId].isMinted, "token already minted");
        _tokens[tokenId] = TokenInfo(
            true, to, value, maturity
        );
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) external override {
        require(_tokens[tokenId].isMinted, "token to burn doesn't exist");
        delete _tokens[tokenId];
    }
}
