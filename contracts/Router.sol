pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title PoolInterface
 * @dev Pool balancer interface
 */
interface PoolInterface {
    function joinPool(uint256 poolAmountOut, uint256[] calldata maxAmountsIn)
        external;

    function totalSupply() external view returns (uint256);

    function getBalance(address token) external view returns (uint256);
}

/**
 * @title StakingInterface
 * @dev Staking manager interface
 */
interface StakingInterface {
    function addStaker(address staker, uint256 amount) external;
}

/**
 * @title Router
 * @dev Liquidity management contract
 */
contract Router is Ownable {
    using SafeMath for uint256;

    address private _balancer;
    address private _stakingManager;
    address private _tUSDT;
    address private _tUSDC;
    address private _tBUSD;
    address private _tDAI;
    address private _tEURxb;

    constructor(
        address balancer,
        address stakingManager,
        address tUSDT,
        address tUSDC,
        address tBUSD,
        address tDAI,
        address tEURxb
    ) public {
        _balancer = balancer;
        _stakingManager = stakingManager;
        _tUSDT = tUSDT;
        _tUSDC = tUSDC;
        _tBUSD = tBUSD;
        _tDAI = tDAI;
        _tEURxb = tEURxb;
    }

    /**
     * @dev Exchange of tokens for EURxb
     * @param from token address
     * @param amount number of tokens
     */
    function exchange(address from, uint256 amount) public {
        require(
            from == _tUSDT || from == _tUSDC || from == _tBUSD || from == _tDAI,
            "Token not found"
        );

        uint256 allowance = IERC20(from).allowance(msg.sender, address(this));
        require(allowance >= amount, "No coins available"); // TODO: overcheck

        uint256 amountEUR = amount.mul(23).div(27);

        IERC20(from).transferFrom(msg.sender, address(this), amount); // TODO: _tUSDT may not contains IERC20.transferFrom
        IERC20(_tEURxb).transfer(msg.sender, amountEUR);
    }

    /**
     * @dev Adding liquidity
     * @param from token address
     * @param amount number of tokens
     */
    function addLiquidity(address from, uint256 amount) public {
        uint256 allowance = IERC20(from).allowance(msg.sender, address(this));
        require(allowance >= amount, "No coins available"); // TODO: overcheck
        IERC20(from).transferFrom(msg.sender, address(this), amount);

        uint256 exchangeTokens = amount.div(2);
        uint256 amountEUR = exchangeTokens.mul(23).div(27);
        exchange(from, exchangeTokens);

        uint256 balanceEUR = IERC20(_tEURxb).balanceOf(address(this));
        require(balanceEUR >= amountEUR, "Not enough tokens");

        IERC20(from).approve(_balancer, exchangeTokens);
        IERC20(_tEURxb).approve(_balancer, amountEUR);

        PoolInterface balancer = PoolInterface(_balancer);
        uint256 totalSupply = balancer.totalSupply();
        uint256 balance = balancer.getBalance(_tEURxb);
        uint256 ratio = amountEUR.div(balance);
        uint256 amountBPT = totalSupply.mul(ratio);

        uint256[] memory data = new uint256[](2);
        data[0] = exchangeTokens;
        data[1] = amountEUR;
        balancer.joinPool(amountBPT, data);

        StakingInterface stakingManager = StakingInterface(_stakingManager);
        IERC20(_balancer).approve(_stakingManager, amountBPT);
        stakingManager.addStaker(msg.sender, amountBPT);
    }
}
