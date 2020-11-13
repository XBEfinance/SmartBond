pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./IBondToken.sol";
import "./IDDP.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import{TokenAccessRoles} from "./TokenAccessRoles.sol";
import{Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract BondToken is IBondNFToken, AccessControl, ERC721 {
    using SafeMath for uint256;
    using Strings for uint256;

    uint256 constant private INTEREST_PERCENT = 7;
    uint256 constant private DAYS_PER_YEAR = 365;
    uint256 constant private SECONDS_PER_DAY = 86400;

    struct TokenInfo {
      uint256 value;
      uint256 interest_per_sec;
      uint256 maturity_ends;
    }

    /// tokens values
    mapping(uint256 => TokenInfo) private _tokens;

    /// value of all tokens summarized
    uint256 private _totalValue;
    /// ddp address
    address _ddp;
    /// sat address
    address _sat;

    constructor(address configurator, address ddp)
        ERC721('BondToken', 'BND') public {
      _setupRole(TokenAccessRoles.burner(), ddp);
      _setupRole(TokenAccessRoles.configurator(), configurator);
    }

    function configure(address sat) public {
      require(hasRole(TokenAccessRoles.configurator(), msg.sender),
              "only configurator role can configure BondToken");

      _sat = sat;
      _setupRole(TokenAccessRoles.minter(), sat);
      _setupRole(TokenAccessRoles.transferer(), sat);
    }

    // approval functions must be prohibited
    function approve(address, uint256) public override { revert(); }

    function getApproved(uint256) public view override returns(address) {
      revert();
    }

    function setApprovalForAll(address, bool) public override { revert(); }

    function isApprovedForAll(address, address) public view override returns(
        bool) {
      revert();
    }

    function totalValue() public view returns(uint256) { return _totalValue; }

    function mint(uint256 tokenId, address to, uint256 value, uint256 maturity)
        external override {
      require(hasRole(TokenAccessRoles.minter(), _msgSender()),
              "only minter role can do mint");

      _mint(to, tokenId);

      uint256 interest_per_second = value.mul(DAYS_PER_YEAR)
                                        .mul(INTEREST_PERCENT)
                                        .div(SECONDS_PER_DAY)
                                        .div(100);
      uint256 maturity_ends = block.timestamp + maturity;
      _tokens[tokenId] = TokenInfo(value, interest_per_second, maturity_ends);
      _totalValue = _totalValue.add(value);
    }

    function hasToken(uint256 tokenId) external view override returns(bool) {
      return _exists(tokenId);
    }

    function burn(uint256 tokenId) external override {
      // TODO: implement
    }
}
