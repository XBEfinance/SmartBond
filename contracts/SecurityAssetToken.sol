pragma solidity >= 0.6.0 < 0.7.0;

import './ERC721.sol';
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import { TokenAccessRoles } from "./TokenAccessRoles.sol";

/// contract SecurityAssetToken
contract SecurityAssetToken is ERC721, AccessControl {
    constructor(string memory baseURI) public ERC721("SecurityAssetToken", "SAT") {
        _setBaseURI(baseURI);
        // set role
    }

    // use parent implementation
    // balanceOf(owner)

    // use parent implementation
    // ownerOf(tokenId)

    function transferFrom(address from, address to, uint256 tokenId) public override {
        safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        require(hasRole(TokenAccessRoles.transferer(), msg.sender));
        super.safeTransferFrom(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) public override {

    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        revert();
    }

    function setApprovalForAll(address operator, bool _approved) public override {

    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return false;
    }

    // IERC721Metadata FUNCTIONS:
    // function name() public view override returns (string memory); // use parent method

    // function symbol() public view override returns (string memory); // use parent method

//    function tokenURI(uint256 tokenId) public view returns (string memory) {
//        string memory tokenURIString = string(abi.encodePacked(_baseURI, Strings.toString(tokenId)));
//        return tokenURIString;
//    }
}
