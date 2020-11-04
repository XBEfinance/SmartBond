pragma solidity ^0.6.2;

import "@openzeppelin/contracts/access/AccessControl.sol";

library roles {
    bytes32 constant MINTER_ROLE = keccak256("NFT_MINTER_ROLE");
    bytes32 constant BURNER_ROLE = keccak256("NFT_BURNER_ROLE");
    bytes32 constant TRANSFERER_ROLE = keccak256("NFT_TRANSFERER_ROLE");

    function minterRole() public view returns(bytes32) {
        return MINTER_ROLE;
    }

    function burnerRole() public view returns(bytes32) {
        return BURNER_ROLE;
    }

    function transfererRole() public view returns(bytes32) {
        return TRANSFERER_ROLE;
    }
}
