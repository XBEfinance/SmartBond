pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./IBondToken.sol";
import "./IDDP.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import { TokenAccessRoles } from "./TokenAccessRoles.sol";


contract BondToken is IBondNFToken, AccessControl, ERC721 {
    using SafeMath for uint256;

    uint256 constant private INTEREST_PERCENT = 7;

    struct TokenInfo {
        uint256 value;
        uint256 interestPerSec;
        uint256 maturityEnds;
    }

    /// tokens values
    mapping(uint256 => TokenInfo) private _tokens;

    /// value of all tokens summarized
    uint256 private _totalValue;

    constructor(address configurator) public ERC721("BondToken", "BND") {
        _setupRole(TokenAccessRoles.admin(), configurator);
    }

    function totalValue() external view returns(uint256) { return _totalValue; }

    function configure(address sat, address ddp) external {
        require(hasRole(TokenAccessRoles.admin(),
            _msgSender()), "caller isn't a administrator");
        _setupRole(TokenAccessRoles.minter(), sat);
        _setupRole(TokenAccessRoles.transferer(), sat);

        _setupRole(TokenAccessRoles.burner(), ddp);
        _setupRole(TokenAccessRoles.transferer(), ddp);
    }

    function mint(uint256 tokenId, address to, uint256 value,
        uint256 maturity) external override
    {
        require(hasRole(TokenAccessRoles.minter(),
            _msgSender()), "only minter role can do mint");

        _mint(to, tokenId);

        uint256 interestPerSec = value
        .mul(INTEREST_PERCENT)
        .div(365 days)
        .div(100);
        uint256 maturityEnds = block.timestamp
        .add(maturity);
        _tokens[tokenId] = TokenInfo(value, interestPerSec, maturityEnds);
        _totalValue = _totalValue.add(value);
    }

    function hasToken(uint256 tokenId) external view override returns(bool) {
        return _exists(tokenId);
    }

    function burn(uint256 tokenId) external override {
        // TODO: implement
    }

    // approval functions must be prohibited
    function approve(address, uint256) public override {
        revert("Doesn't support");
    }

    function getApproved(uint256) public view override returns(address) {
        revert("Doesn't support");
    }

    function setApprovalForAll(address, bool) public override {
        revert("Doesn't support");
    }

    function isApprovedForAll(address, address) public view override returns(bool) {
        revert("Doesn't support");
    }
}
