pragma solidity >= 0.6.0 < 0.7.0;

import "../interfaces/IBondToken.sol";
import "../templates/ERC721.sol";


/**
 * @dev mock for BondToken. Allows to check for bond token existance and
 * creation
 */
contract BondTokenMock is ERC721, IBondToken {
  struct TokenInfo {
    bool isMinted;
    address to;
    uint256 value;
    uint256 maturity;
  }

  mapping(uint256 => TokenInfo) private _tokens;

  constructor() ERC721("BondTokenMock", "BND") public {}

  function hasToken(uint256 tokenId) external view override returns(bool) {
    return _tokens[tokenId].isMinted;
  }

  function getTokenInfo(uint256 tokenId) external view override
    returns (uint256 value, uint256 interest, uint256 maturity)
  {
    revert("not necessary");
  }

  function mint(
      uint256 tokenId,
      address to,
      uint256 value,
      uint256 maturity) external override
  {
    require(!_tokens[tokenId].isMinted, "token already minted");
    _tokens[tokenId] = TokenInfo(
                            true,
                            to,
                            value,
                            maturity);

    _mint(to, tokenId);
  }

  function burn(uint256 tokenId) external override {
    require(_tokens[tokenId].isMinted, "token to burn doesn't exist");
    delete _tokens[tokenId];
  }

  function transferFrom(address from, address to, uint256 tokenId) public override {
        _safeTransferFrom(
            _msgSender(),
            from,
            to,
            tokenId,
            "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override(IBondToken, ERC721) {
        _safeTransferFrom(
            _msgSender(),
            from,
            to,
            tokenId,
            "");
    }

    function safeTransferFrom(address from, address to,
        uint256 tokenId, bytes memory _data) public override
    {
        _safeTransferFrom(
            _msgSender(),
            from,
            to,
            tokenId,
            _data);
    }

    function _safeTransferFrom(
        address sender,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data) private
    {
      // solium-disable-previous-line no-empty-blocks
    }
}
