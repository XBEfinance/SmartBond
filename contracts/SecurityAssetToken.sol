pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./IBondNFToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import{TokenAccessRoles} from "./TokenAccessRoles.sol";
import{StringUtil} from "./StringUtil.sol";
import{Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * SecurityAssetToken represents an asset or deposit token, which has a
 * declared value
 */
contract SecurityAssetToken is ERC721, AccessControl {
    using SafeMath for uint256;
    using Strings for uint256;
    using StringUtil for address;
    using StringUtil for string;

    mapping(uint256 => uint256) private _values; // tokens values
    mapping(address => bool) private _allowList; // list of accounts, which are
                                                 // allowed to get transfers

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

    function allowAccount(address account) public {
      require(hasRole(TokenAccessRoles.administrator(), msg.sender),
              "only administrator can modify allow list");
      _allowList[account] = true;
    }

    function disallowAccount(address account) public {
      require(hasRole(TokenAccessRoles.administrator(), msg.sender),
              "only administrator can modify allow list");

      delete _allowList[account];
    }

    function transferFrom(address from, address to,
                          uint256 tokenId) public override {
      safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to,
                              uint256 tokenId) public override {
      address sender = _msgSender();
      require(hasRole(TokenAccessRoles.transferer(), sender),
              sender.toString().append(" is not allowed to call transfer"));

      super.safeTransferFrom(from, to, tokenId, "");
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
              sender.toString().append(" is not allowed to mint SAT tokens"));

      // check if account is in allow list
      require(_allowList[to],
              to.toString().append(" is not allowed to get tokens"));

      _values[tokenId] = value;
      _totalValue = _totalValue.add(value);

      _mint(to, tokenId);

      IBondNFToken(_bond).mint(tokenId, to, value.mul(3).div(4), maturity);

      emit SecurityAssetTokenMinted(to, tokenId, value, maturity);
    }

    /**
     * burns security asset token
     */
    function burn(uint256 tokenId) external {
      address sender = msg.sender;

      require(hasRole(TokenAccessRoles.burner(), sender),
              sender.toString()
                  .append(" is not allowed to burn SAT tokens")
                  .append(tokenId.toString()));
      // get token properties
      uint256 value = _values[tokenId];
      // cannot burn non-existent token
      require(
          value > 0,
          string("token ").append(tokenId.toString()).append(" doesn't exist"));

      // TODO: maybe add check for bond token existence

      // remove from _values
      delete _values[tokenId];

      // decrease total totalSupply (check for going below zero is conducted
      // inside of SafeMath's sub method)
      _totalValue = _totalValue.sub(value);

      _burn(tokenId);

      emit SecurityAssetTokenBurned(tokenId);
    }
}
