pragma solidity >= 0.6.0 < 0.7.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

library TokenAccessRoles {
    bytes32 private constant MINTER_ROLE = keccak256("NFT_MINTER_ROLE");
    bytes32 private constant BURNER_ROLE = keccak256("NFT_BURNER_ROLE");
    bytes32 private constant TRANSFERER_ROLE = keccak256("NFT_TRANSFERER_ROLE");

    function minter() public pure returns(bytes32) {
        return MINTER_ROLE;
    }

    function burner() public pure returns(bytes32) {
        return BURNER_ROLE;
    }

    function transferer() public pure returns(bytes32) {
        return TRANSFERER_ROLE;
    }
}
