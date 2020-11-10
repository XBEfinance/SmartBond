pragma solidity >= 0.6.0 < 0.7.0;

import "../IBondNFToken.sol";

/**
 * @dev mock for BondNFToken. Allows to check for bond token existance and creation
 */
contract NFBondTockenMock is IBondNFToken {
  struct Content {
    bool isMinted;
    uint256 tokenId;
    address to;
    uint256 value;
    uint256 maturity;
  }

  event BondTokenMinted(uint256 tokenId, address to, uint256 value, uint256 maturity);
  event BondTokenBurned(uint256 tokenId);

  mapping(uint256 => Content) private _tokens;

  function hasToken(uint256 tokenId) public returns(bool) {
    return _tokens[tokenId].isMinted;
  }

  function mint(uint256 tokenId, address to, uint256 value, uint256 maturity)
      override external {
    require(!hasToken(tokenId), "token already minted");
    _tokens[tokenId] = Content(true, tokenId, to, value, maturity);
    emit BondTokenMinted(tokenId, to, value, maturity);
  }

  function burn(uint256 tokenId) override external {
    require(hasToken(tokenId), "token to burn doesn't exist");
    delete _tokens[tokenId];
    emit BondTokenBurned(tokenId);
  }
}
