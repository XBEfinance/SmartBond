pragma solidity >= 0.6.0 < 0.7.0;

import "../IBondToken.sol";
import "../ERC721.sol";


/**
 * @dev mock for BondNFToken. Allows to check for bond token existance and
 * creation
 */
contract NFBondTokenMock is ERC721, IBondNFToken {
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

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
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

    function _isApproved(address spender, uint256 tokenId) private view returns(bool) {
        require(_exists(tokenId), "token does not exist");
        address owner = ownerOf(tokenId);
        return (getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _safeTransferFrom(
        address sender,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data) private
    {
        // no need to check this logic right here
    }
}
