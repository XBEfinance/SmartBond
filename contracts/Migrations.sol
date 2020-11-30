// SPDX-License-Identifier: MIT
pragma solidity >= 0.6.0 < 0.7.0;


contract Migrations {
    address public owner = msg.sender;
    uint public lastCompletedMigration;

    modifier restricted() {
        require(
            msg.sender == owner,
            "This function is restricted to the contract's owner"
        );
        _;
    }

    function setCompleted(uint completed) public restricted {
        lastCompletedMigration = completed;
    }
}
