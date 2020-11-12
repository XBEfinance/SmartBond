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
    function addStaker(
        address staker,
        address pool,
        uint256 amount
    ) external;
}

/**
 * @title Router
 * @dev Liquidity management contract
 */
contract Router is Ownable {
    using SafeMath for uint256;

    address private _teamAddress;
    address private _stakingManager;
    address private _tUSDT;
    address private _tUSDC;
    address private _tBUSD;
    address private _tDAI;
    address private _tEURxb;

    mapping(address => address) _balancerPools;

    constructor(
        address teamAddress,
        address stakingManager,
        address tUSDT,
        address tUSDC,
        address tBUSD,
        address tDAI,
        address tEURxb
    ) public {
        _teamAddress = teamAddress;
        _stakingManager = stakingManager;
        _tUSDT = tUSDT;
        _tUSDC = tUSDC;
        _tBUSD = tBUSD;
        _tDAI = tDAI;
        _tEURxb = tEURxb;
    }

    /**
     * @return staking manager address
     */
    function stakingManager() public view returns (address) {
        return _stakingManager;
    }

    /**
     * @dev Set balancer pool
     * @param token address
     * @param pool address
     */
    function setBalancerPool(address token, address pool) public onlyOwner {
        _balancerPools[token] = pool;
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

        uint256 amountEUR = amount.mul(23).div(27);

        IERC20(from).transferFrom(msg.sender, _teamAddress, amount); // TODO: _tUSDT may not contains IERC20.transferFrom
        IERC20(_tEURxb).transfer(msg.sender, amountEUR);
    }

    /**
     * @dev Adding liquidity
     * @param token address
     * @param amount number of tokens
     */
    function addLiquidity(address token, uint256 amount) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint256 exchangeTokens = amount.div(2);
        uint256 amountEUR = exchangeTokens.mul(23).div(27);
        exchange(token, exchangeTokens);

        uint256 balanceEUR = IERC20(_tEURxb).balanceOf(address(this));
        require(balanceEUR >= amountEUR, "Not enough tokens");

        address balancerPool = _balancerPools[token];

        IERC20(token).approve(balancerPool, exchangeTokens);
        IERC20(_tEURxb).approve(balancerPool, amountEUR);

        PoolInterface balancer = PoolInterface(balancerPool);
        uint256 totalSupply = balancer.totalSupply();
        uint256 balance = balancer.getBalance(_tEURxb);
        uint256 ratio = amountEUR.div(balance);
        uint256 amountBPT = totalSupply.mul(ratio);

        uint256[] memory data = new uint256[](2);
        data[0] = amountEUR;
        data[1] = exchangeTokens;
        balancer.joinPool(amountBPT, data);

        StakingInterface manager = StakingInterface(_stakingManager);
        IERC20(balancerPool).approve(_stakingManager, amountBPT);
        manager.addStaker(msg.sender, balancerPool, amountBPT);
    }
}
