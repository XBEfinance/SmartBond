pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./IBondNFToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import{TokenAccessRoles} from "./TokenAccessRoles.sol";
import{StringUtil} from "./StringUtil.sol";
import{Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract SecurityAssetToken is ERC721, AccessControl {
    using SafeMath for uint256;
    using Strings for uint256;
    using StringUtil for address;
    using StringUtil for string;

    mapping(uint256 => uint256) private _values; // tokens values
    mapping(address => bool) private _allowList; // list of accounts, which are
                                                  // allowed to get transfers

    uint256 private _totalValue; // value of all tokens summarized
    address private _bondToken;  // bond token contract address

    constructor(string memory baseURI, address miris,
                address bondToken) public ERC721("SecurityAssetToken", "SAT") {
      _setBaseURI(baseURI);
      _bondToken = bondToken;

      // set roles
      _setupRole(TokenAccessRoles.minter(), miris);
      _setupRole(TokenAccessRoles.burner(), miris);
      _setupRole(TokenAccessRoles.transferer(), miris);
    }

    // IERC721 EVENTS:

    /* event Transfer(address from, address to, uint256  tokenId)
     * is emitted
     * when miris mints new token
     * when miris burns token
     * when transfers token from one account to another
     * when BOND NFT token transfers SAT token from one account to another
     */

    /* event Approval(address indexed owner, address indexed approved, uint256
     * indexed tokenId); is emitted when current owner specifies whom is he
     * willing to transfer token to
     */

    /* event ApprovalForAll(address indexed owner, address indexed operator,
     * bool approved); is emitted when current owner specifies whom is he
     * willing to transfer all his tokens to
     */

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

    /// Only miris is allowed to mint tokens
    function mint(address to, uint256 tokenId, uint256 value, uint256 maturity)
        external {
      // check role
      address sender = _msgSender();
      require(hasRole(TokenAccessRoles.minter(), sender),
              sender.toString().append(" is not allowed to mint SAT tokens"));

      // check if account is in allow list
      require(_allowList[to],
              to.toString().append(" is not allowed to get tokens"));

      _values[tokenId] = value;
      _totalValue = _totalValue.add(value);

      _mint(to, tokenId);

      IBondNFT(_bondToken).mint(tokenId, to, value.mul(3).div(4), maturity);
    }

    /// Only miris is allowed to burn tokens
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

      // remove from _values and _maturities
      delete _values[tokenId];

      // decrease total totalSupply
      _totalValue = _totalValue.sub(value);

      // TODO: check whether BOND token was burned
      _burn(tokenId);
    }

    /// @return total value of all existing tokens
    function totalValue() public view returns(uint256) { return _totalValue; }
}
