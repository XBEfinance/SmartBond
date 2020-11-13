pragma solidity ^0.6.0;

/**
 * @title IBalancerPool
 * @dev Pool balancer interface
 */
interface IBalancerPool {
    function joinPool(uint256 poolAmountOut, uint256[] calldata maxAmountsIn)
        external;

    function totalSupply() external view returns (uint256);

    function getBalance(address token) external view returns (uint256);
}
