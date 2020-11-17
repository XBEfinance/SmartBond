pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IBalancerPool.sol";
import "./IStakingManager.sol";

/**
 * @title Router
 * @dev Liquidity management contract
 */
contract Router is Ownable {
    using SafeMath for uint256;

    address private _teamAddress;
    address private _stakingManager;
    uint256 private _startTime;
    address private _tUSDT;
    address private _tUSDC;
    address private _tBUSD;
    address private _tDAI;
    address private _tEURxb;

    bool _isClosedContract = false;

    mapping(address => address) private _balancerPools; // token address => balancer pool address

    constructor(
        address teamAddress,
        address stakingManager,
        uint256 startTime,
        address tUSDT,
        address tUSDC,
        address tBUSD,
        address tDAI,
        address tEURxb
    ) public {
        _teamAddress = teamAddress;
        _stakingManager = stakingManager;
        _startTime = startTime;
        _tUSDT = tUSDT;
        _tUSDC = tUSDC;
        _tBUSD = tBUSD;
        _tDAI = tDAI;
        _tEURxb = tEURxb;
    }

    /**
     * @return are the tokens frozen
     */
    function isClosedContract() external view returns (bool) {
        return _isClosedContract;
    }

    /**
     * @return staking manager address
     */
    function stakingManager() external view returns (address) {
        return _stakingManager;
    }

    /**
     * @return start time
     */
    function startTime() external view returns (uint256) {
        return _startTime;
    }

    /**
     * @return balancer pool
     */
    function balancerPools(address token) external view returns (address) {
        return _balancerPools[token];
    }

    /**
     * @dev Set balancer pool
     * @param token address
     * @param pool address
     */
    function setBalancerPool(address token, address pool) external onlyOwner {
        _balancerPools[token] = pool;
    }

    /**
     * @return team address
     */
    function teamAddress() external view returns (address) {
        return _teamAddress;
    }

    /**
     * @dev set team address
     * @param team address
     */
    function setTeamAddress(address team) external onlyOwner {
        _teamAddress = team;
    }

    /**
     * @dev Close contract
     */
    function closeContract() external onlyOwner {
        require(_startTime + 7 days < now, "Time is not over");
        require(now >= _startTime, "The time has not come yet");
        uint256 balance = address(this).balance;
        if (balance > 0) {
            IERC20(_tEURxb).transfer(_msgSender(), balance);
        }
        _isClosedContract = true;
    }

    /**
     * @dev Adding liquidity
     * @param token address
     * @param amount number of tokens
     */
    function addLiquidity(address token, uint256 amount) external {
        require(now >= _startTime, "The time has not come yet");
        require(!_isClosedContract, "Contract closed");
        IERC20(token).transferFrom(_msgSender(), address(this), amount);

        address balancerPool = _balancerPools[token];
        IBalancerPool balancer = IBalancerPool(balancerPool);
        uint256 totalSupply = balancer.totalSupply();

        uint256 exchangeTokens = amount.div(2);
        uint256 amountEUR = exchangeTokens.mul(23).div(27);
        uint256 balanceEUR = IERC20(_tEURxb).balanceOf(address(this));

        uint256 amountBPT;

        if (balanceEUR >= amountEUR) {
            exchange(token, exchangeTokens);

            IERC20(token).approve(balancerPool, exchangeTokens);
            IERC20(_tEURxb).approve(balancerPool, amountEUR);

            uint256 balance = balancer.getBalance(_tEURxb);
            uint256 ratio = amountEUR.mul(10**18).div(balance);
            amountBPT = totalSupply.mul(ratio).div(10**18);
            amountBPT = amountBPT.mul(99).div(100);

            uint256[] memory data = new uint256[](2);
            data[0] = amountEUR;
            data[1] = exchangeTokens;
            balancer.joinPool(amountBPT, data);
        } else {
            IERC20(token).approve(balancerPool, amount);
            uint256 tokenBalanceIn = balancer.getBalance(token);
            uint256 tokenWeightIn = balancer.getDenormalizedWeight(token);
            uint256 totalWeight = balancer.getTotalDenormalizedWeight();
            uint256 tokenAmountIn = amount;
            uint256 swapFee = balancer.getSwapFee();

            amountBPT = balancer.calcPoolOutGivenSingleIn(
                tokenBalanceIn,
                tokenWeightIn,
                totalSupply,
                totalWeight,
                tokenAmountIn,
                swapFee
            );
            balancer.joinswapExternAmountIn(token, amount, amountBPT);
        }

        if (_startTime + 7 days < now) {
            IERC20(balancerPool).transfer(_msgSender(), amountBPT);
        } else {
            IStakingManager manager = IStakingManager(_stakingManager);
            IERC20(balancerPool).approve(_stakingManager, amountBPT);
            manager.addStaker(_msgSender(), balancerPool, amountBPT);
        }
    }

    /**
     * @dev Exchange of tokens for EURxb
     * @param from token address
     * @param amount number of tokens
     */
    function exchange(address from, uint256 amount) public {
        require(!_isClosedContract, "Contract closed");
        require(
            from == _tUSDT || from == _tUSDC || from == _tBUSD || from == _tDAI,
            "Token not found"
        );
        uint256 amountEUR = amount.mul(23).div(27);

        uint256 balanceEUR = IERC20(_tEURxb).balanceOf(address(this));
        require(balanceEUR >= amountEUR, "Not enough tokens");

        IERC20(from).transferFrom(_msgSender(), _teamAddress, amount); // TODO: _tUSDT may not contains IERC20.transferFrom
        if (_msgSender() != address(this)) {
            IERC20(_tEURxb).transfer(_msgSender(), amountEUR);
        }
    }
}
