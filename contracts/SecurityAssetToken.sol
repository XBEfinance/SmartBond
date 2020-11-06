pragma solidity >= 0.6.0 < 0.7.0;

import "./ERC721.sol";
import "./Interfaces.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import {TokenAccessRoles} from "./TokenAccessRoles.sol";
import {StringUtil} from "./StringUtil.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract SecurityAssetToken is ERC721, AccessControl {
    using SafeMath for uint256;
    using Strings for uint256;
    using StringUtil for address;
    using StringUtil for string;

    struct _ApprovalForAll {
        bool isDefined;
        mapping(address => bool) approvals;
    }

    mapping(uint256 => uint256) private _values; // tokens values
    mapping(address => bool) private _allowList; // list of accounts, which are allowed to get transfers

    uint256 private _totalValue; // value of all tokens summarized
    address private bondAddress;

    constructor(string memory baseURI, address miris, address bondToken) public ERC721("SecurityAssetToken", "SAT") {
        _setBaseURI(baseURI);
        // set roles
        _setupRole(TokenAccessRoles.minter(), miris);
        _setupRole(TokenAccessRoles.burner(), miris);
        _setupRole(TokenAccessRoles.transferer(), miris);
        bondAddress = bondToken;
    }

    //IERC721 EVENTS:

    /* event Transfer(from, to, tokenId)
     * args: owner, approved, tokenId
     * is emitted
     * when miris mints new token
     * when miris burns token
     * when transfers token from one account to another
     * when BOND NFT token transfers SAT token from one account to another
     */

    /* event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
     * args: owner, operator, approved
     * is emitted when current owner specifies whom is he willing to transfer token to
     */

    /* event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
     * is emitted when current owner specifies whom is he willing to transfer all his tokens to
     */

    // balanceOf(owner) // use default implementation
    // ownerOf(tokenId) // use default implementation

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(hasRole(TokenAccessRoles.transferer(), _msgSender()),
            _msgSender().toString().append(" is not allowed to call transfer"));

        // check if account is in allow list
        require(_allowList[to], to.toString().append(" is not allowed to get tokens"));

        require(_isApprovedOrOwner(from, tokenId), "ERC721: transfer caller is not owner nor approved");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public override {
        require(hasRole(TokenAccessRoles.transferer(), _msgSender()),
            _msgSender().toString().append(" is not allowed to call transfer"));

        // check if account is in allow list
        require(_allowList[to], to.toString().append(" is not allowed to get tokens"));

        require(_isApprovedOrOwner(from, tokenId), "ERC721: transfer caller is not owner nor approved");

        super.safeTransferFrom(from, to, tokenId, _data);
    }

//    function approve(address to, uint256 tokenId) public override {
//        _approved[tokenId] = to;
//    }

    /// @return returns address(0) if not approved
//    function getApproved(uint256 tokenId) public view override returns (address) {
//        return _approved[tokenId];
//    }

//    function setApprovalForAll(address operator, bool approved) public override {
//        // TODO: discuss and implement
//    }
//
//    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
//        _ApprovalForAll storage approval = _approvalsForAll[owner];
//        if (!approval.isDefined) {
//            return false;
//        }
//
//        return approval.approvals[owner];
//    }

    /// Only miris is allowed to mint tokens
    function mint(address to, uint256 tokenId, uint256 value, uint256 maturity) external {
        // check role
        address sender = msg.sender;
        require(hasRole(TokenAccessRoles.minter(), sender),
            sender.toString().append(" is not allowed to mint SAT tokens"));

        require(value > 0, string("token ").append(tokenId.toString()).append(" doesn't exist"));
        // check if account is in allow list
        require(_allowList[to], to.toString().append(" is not allowed to get tokens"));

        _values[tokenId] = value;
        _totalValue = _totalValue.add(value);

        _mint(to, tokenId);

        // TODO: reconcile who should create BOND NFT token
        // TODO: check if Transfer event is emitted automatically
        // TODO: create BOND NFT
         IBondNFT(bondAddress).mint(to, tokenId, value.mul(3).div(4), maturity);
    }

    /// Only miris is allowed to burn tokens
    function burn(uint256 tokenId) public {
        address sender = msg.sender;
        require(hasRole(TokenAccessRoles.burner(), sender),
            sender.toString().append(" is not allowed to burn SAT tokens").append(tokenId.toString())
        );

        ownerOf(tokenId);
//        // get token properties
//        uint256 value = _values[tokenId];
//        // cannot burn non-existent token
//        require(value > 0, string("token ").append(tokenId.toString()).append(" doesn't exist"));

        // remove from _values and _maturities
        delete _values[tokenId];
//        delete _maturities[tokenId];

        // decrease total totalSupply
        _totalValue = _totalValue.sub(_values[tokenId]);

        // TODO: check whether BOND token was burned
        _burn(tokenId);
    }

    // IERC721Metadata FUNCTIONS:
    // name() // use default implementation
    // symbol() // use default implementation
    // tokenURI() // use default implementation

    // IERC721Enumerable FUNCTIONS:
    // totalSupply() // use default implementation

    /// @return total value of all existing tokens
    function totalValue() public view returns (uint256) {
        return _totalValue;
    }

    // tokenOfOwnerByIndex(owner, index) // use default implementation
    // tokenByIndex(index) // use default implementation

}
