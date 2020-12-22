pragma solidity ^0.6.0;

/**
 * @title IStakingManager
 * @dev Staking manager interface
 */
interface IStakingManager {
    function addStake(
        address user,
        address pool,
        uint256 amount
    ) external;
}
