pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./IBondToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import { TokenAccessRoles } from "./TokenAccessRoles.sol";


/**
 * SecurityAssetToken represents an asset or deposit token, which has a
 * declared value
 */
contract SecurityAssetToken is ERC721, AccessControl {
    using SafeMath for uint256;

    /// tokens values
    mapping(uint256 => uint256) private _values;
    /// list of accounts, which are allowed to get transfers
    mapping(address => bool) private _allowList;

    uint256 private _totalValue; // value of all tokens summarized
    address private _bond;       // bond token contract address

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
        _setupRole(TokenAccessRoles.admin(), miris);

        _setupRole(TokenAccessRoles.transferer(), bond);
    }

    /**
     * @return total value of all existing tokens
     */
    function totalValue() external view returns(uint256) { return _totalValue; }

    /**
     * Allows user to receive tokens
     */
    function allowAccount(address account) external {
        require(hasRole(TokenAccessRoles.admin(), _msgSender()),
              "sender isn't a admin");
        _allowList[account] = true;
    }

    /**
     * Forbids user from receiving tokens
     */
    function disallowAccount(address account) external {
        require(hasRole(TokenAccessRoles.admin(), _msgSender()),
            "sender isn't a admin");
        delete _allowList[account];
    }

    /**
     * mints a new SAT token and it's NFT bond token accordingly
     * @param to token owner
     * @param tokenId unique token id
     * @param value collateral value
     * @param maturity datetime stamp when token's deposit value must be
     * returned
     */
    function mint(address to, uint256 tokenId,
        uint256 value, uint256 maturity) external
    {
        // check role
        // only external account having minter role is allowed to mint tokens
        require(hasRole(TokenAccessRoles.minter(), _msgSender()),
            "sender isn't a minter");

        // check if account is in allow list
        require(isAllowedAccount(to), "user is not allowed to receive tokens");

        _mint(to, tokenId);

        _values[tokenId] = value;
        _totalValue = _totalValue.add(value);

        // mint corresponding bond token
        IBondNFToken(_bond).mint(tokenId, to,
            value.mul(75).div(100), maturity);
    }

    /**
     * burns security asset token
     */
    function burn(uint256 tokenId) external {
        require(hasRole(TokenAccessRoles.burner(), _msgSender()),
            "sender isn't a burner");
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
    }

    /**
     * Checks if user is allowed to receive tokens
     */
    function isAllowedAccount(address account) external view returns(bool) {
        return _isAllowedAccount;
    }

    /**
     * Transfers token from one user to another.
     * @param from token owner address
     * @param to token receiver address
     * @param tokenId token id to transfer
     */
    function transferFrom(address from, address to, uint256 tokenId) public override {
        _safeTransferFrom(_msgSender(), from, to,
            tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        _safeTransferFrom(_msgSender(), from, to,
            tokenId, "");
    }

    function safeTransferFrom(address from, address to,
        uint256 tokenId, bytes memory _data) public override
    {
        _safeTransferFrom( _msgSender(), from, to,
            tokenId, _data);
    }

    function _isApproved(address spender, uint256 tokenId) private view returns(bool) {
        require(_exists(tokenId), "token not exist");
        address owner = ownerOf(tokenId);
        return (getApproved(tokenId) == spender ||
        isApprovedForAll(owner, spender));
    }

    function _safeTransferFrom(
        address sender,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data) private
    {
        require(hasRole(TokenAccessRoles.transferer(), sender),
            "sender isn't a transferer");
        require(_isAllowedAccount(to), "user is not allowed to receive tokens");
        require(_isApproved(to, tokenId), "transfer was not approved");

        _safeTransfer(from, to, tokenId,
            _data);
    }

    function _isAllowedAccount(address account) private view returns(bool) {
        return _allowList[account];
    }
}
