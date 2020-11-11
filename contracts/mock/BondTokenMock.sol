pragma solidity >= 0.6.0 < 0.7.0;

import "../IBondToken.sol";

/**
 * @dev mock for BondNFToken. Allows to check for bond token existance and
 * creation
 */
contract NFBondTokenMock is IBondNFToken {
  struct TokenInfo {
    bool isMinted;
    address to;
    uint256 value;
    uint256 maturity;
  }

  event
  BondTokenMinted(uint256 tokenId, address to, uint256 value, uint256 maturity);
  event BondTokenBurned(uint256 tokenId);

  mapping(uint256 => TokenInfo) private _tokens;

  function hasToken(uint256 tokenId) external view override returns(bool) {
    return _tokens[tokenId].isMinted;
  }

  function mint(uint256 tokenId, address to, uint256 value, uint256 maturity)
      override external {
    require(!_tokens[tokenId].isMinted, "token already minted");
    _tokens[tokenId] = TokenInfo(true, to, value, maturity);
    emit BondTokenMinted(tokenId, to, value, maturity);
  }

  function burn(uint256 tokenId) override external {
    require(_tokens[tokenId].isMinted, "token to burn doesn't exist");
    delete _tokens[tokenId];
    emit BondTokenBurned(tokenId);
  }

  function isTokenExist(uint256 tokenId) external view {}
}
