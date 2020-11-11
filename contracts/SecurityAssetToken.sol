pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./IBondToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import{TokenAccessRoles} from "./TokenAccessRoles.sol";
import{Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * SecurityAssetToken represents an asset or deposit token, which has a
 * declared value
 */
contract SecurityAssetToken is ERC721, AccessControl {
    using SafeMath for uint256;
    using Strings for uint256;

    /// tokens values
    mapping(uint256 => uint256) private _values;
    /// list of accounts, which are allowed to get transfers
    mapping(address => bool) private _allowList;

    uint256 private _totalValue; // value of all tokens summarized
    address private _bond;       // bond token contract address

    event SecurityAssetTokenMinted(address to, uint256 tokenId, uint256 value,
                                   uint256 maturity);

    event SecurityAssetTokenBurned(uint256 tokenId);

    /**
     * @param baseURI token base URI
     * @param miris external miris manager account
     * @param bond BondToken contract address
     */
    constructor(string memory baseURI, address miris,
                address bond) public ERC721("SecurityAssetToken", "SAT") {
      _setBaseURI(baseURI);
      _bond = bond;

      // setup roles
      _setupRole(TokenAccessRoles.minter(), miris);
      _setupRole(TokenAccessRoles.burner(), miris);
      _setupRole(TokenAccessRoles.transferer(), miris);
      _setupRole(TokenAccessRoles.administrator(), miris);
      _setupRole(TokenAccessRoles.transferer(), bond);
    }

    /**
     * @return total value of all existing tokens
     */
    function totalValue() public view returns(uint256) { return _totalValue; }

    /**
     * Allows user to receive tokens
     */
    function allowAccount(address account) public {
      require(hasRole(TokenAccessRoles.administrator(), msg.sender),
              "only administrator can modify allow list");
      _allowList[account] = true;
    }

    /**
     * Checks if user is allowed to receive tokens
     */
    function isAllowedAccount(address account) public view returns(bool) {
      return _allowList[account];
    }

    /**
     * Forbids user from receiving tokens
     */
    function disallowAccount(address account) public {
      require(hasRole(TokenAccessRoles.administrator(), msg.sender),
              "only administrator can modify allow list");

      delete _allowList[account];
    }

    /**
     * Transfers token from one user to another.
     * @param from token owner address
     * @param to token receiver address
     * @param tokenId token id to transfer
     */
    function transferFrom(address from, address to,
                          uint256 tokenId) public override {

      _safeTransferFrom(_msgSender(), from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to,
                              uint256 tokenId) public override {
      _safeTransferFrom(_msgSender(), from, to, tokenId, "");
    }

    function _isApproved(address spender, uint256 tokenId) private view returns(
        bool) {
      require(_exists(tokenId), "ERC721: operator query for nonexistent token");
      address owner = ownerOf(tokenId);
      return (getApproved(tokenId) == spender ||
              isApprovedForAll(owner, spender));
    }

    function safeTransferFrom(address from, address to, uint256 tokenId,
                              bytes memory _data) public override {
      _safeTransferFrom(_msgSender(), from, to, tokenId, _data);
    }

    function _safeTransferFrom(address sender, address from, address to,
                               uint256 tokenId, bytes memory _data) private {
      require(hasRole(TokenAccessRoles.transferer(), sender),
              "sender is not allowed to call transfer");
      require(isAllowedAccount(to), "user is not allowed to receive tokens");
      require(_isApproved(to, tokenId), "transfer was not approved");

      _safeTransfer(from, to, tokenId, _data);
    }

    /**
     * mints a new SAT token and it's NFT bond token accordingly
     * @param to token owner
     * @param tokenId unique token id
     * @param value collateral value
     * @param maturity datetime stamp when token's deposit value must be
     * returned
     */
    function mint(address to, uint256 tokenId, uint256 value, uint256 maturity)
        external {
      // check role
      address sender = _msgSender();
      // only external account having minter role is allowed to mint tokens
      require(hasRole(TokenAccessRoles.minter(), sender),
              "user is not allowed to mint SAT tokens");

      // check if account is in allow list
      require(isAllowedAccount(to), "user is not allowed to get tokens");

      _mint(to, tokenId);

      _values[tokenId] = value;
      _totalValue = _totalValue.add(value);

      // mint corresponding bond token
      IBondNFToken(_bond).mint(tokenId, to, value.mul(3).div(4), maturity);

      emit SecurityAssetTokenMinted(to, tokenId, value, maturity);
    }

    /**
     * burns security asset token
     */
    function burn(uint256 tokenId) external {
      address sender = msg.sender;
      require(hasRole(TokenAccessRoles.burner(), sender),
              "sender is not allowed to burn SAT tokens");
      // get token properties
      uint256 value = _values[tokenId];

      // cannot burn non-existent token
      require(value > 0, "token doesn't exist");

      // cannot burn sat token when corresponding bond token still alive
      require(!IBondNFToken(_bond).hasToken(tokenId),
              "bond token is still alive");

      _burn(tokenId);

      // remove from _values
      delete _values[tokenId];

      // decrease total totalSupply (check for going below zero is conducted
      // inside of SafeMath's sub method)
      _totalValue = _totalValue.sub(value);

      emit SecurityAssetTokenBurned(tokenId);
    }
}
