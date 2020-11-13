pragma solidity >= 0.6.0 < 0.7.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

library TokenAccessRoles {
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 private constant TRANSFERER_ROLE = keccak256("TRANSFERER_ROLE");
    bytes32 private constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 private constant CONFIGURATOR_ROLE = keccak256("CONFIGURATOR_ROLE");

    function minter() public pure returns (bytes32) {
        return MINTER_ROLE;
    }

    function burner() public pure returns (bytes32) {
        return BURNER_ROLE;
    }

    function transferer() public pure returns (bytes32) {
        return TRANSFERER_ROLE;
    }

    function administrator() public pure returns (bytes32) {
        return ADMINISTRATOR_ROLE;
    }

    function configurator() public pure returns (bytes32) {
        return CONFIGURATOR_ROLE;
    }
}
