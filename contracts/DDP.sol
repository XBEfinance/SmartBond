pragma solidity >=0.6.0 <0.7.0;

import "./ERC721.sol";
import "./IBondToken.sol";
import "./IDDP.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import {TokenAccessRoles} from "./TokenAccessRoles.sol";


contract DDP is IDDP, AccessControl {
    /// bond address
    address private _bond;

    constructor(address admin) public {
        _setupRole(TokenAccessRoles.admin(), admin);
    }

    function configure(address bond) external {
        require(
            hasRole(TokenAccessRoles.admin(), _msgSender()),
            "caller isn't an administrator"
        );

        _bond = bond;
    }

    function deposit(
        uint256 tokenId,
        uint256 value,
        uint256 maturity) external override
    {
        // solium-disable-previous-line no-empty-blocks
        // TODO: implement
    }

    function withdraw() external {
        // solium-disable-previous-line no-empty-blocks
        // TODO: implement
    }
}
