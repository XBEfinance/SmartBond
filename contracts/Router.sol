pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/IBalancerPool.sol";
import "./interfaces/IStakingManager.sol";
import "../third-party-contracts/Uniswap/interfaces/IUniswapV2Pair.sol";
import "../third-party-contracts/UniswapLib/libraries/TransferHelper.sol";
import "../third-party-contracts/UniswapRouter/libraries/UniswapV2Library.sol";
import "../third-party-contracts/UniswapRouter/interfaces/IUniswapV2Router01.sol";

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
    IERC20 private _tEURxb;

    IUniswapV2Pair private _pairUSDT;
    IUniswapV2Pair private _pairBUSD;
    IUniswapV2Router01 private _uniswapRouter;

    bool _isClosedContract = false;

    mapping(address => address) private _balancerPools; // token address => pool pool address
    mapping(address => address) private _uniswapPairs;

    constructor(
        address teamAddress,
        address stakingManager,
        uint256 startTime,
        address tUSDT,
        address tUSDC,
        address tBUSD,
        address tDAI,
        address tEURxb,
        address uniswapRouter
    ) public {
        _teamAddress = teamAddress;
        _stakingManager = stakingManager;
        _startTime = startTime;
        _tUSDT = tUSDT;
        _tUSDC = tUSDC;
        _tBUSD = tBUSD;
        _tDAI = tDAI;
        _tEURxb = IERC20(tEURxb);
        _uniswapRouter = IUniswapV2Router01(uniswapRouter);
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
     * @return pool pool
     */
    function balancerPools(address token) external view returns (address) {
        return _balancerPools[token];
    }

    /**
     * @dev Set pool pool
     * @param token address
     * @param pool address
     */
    function setBalancerPool(address token, address pool) external onlyOwner {
        _balancerPools[token] = pool;
    }

    function uniswapPair(address token) external view returns (address) {
        return _uniswapPairs[token];
    }

    function setUniswapPair(address token, address pair) external onlyOwner {
        _uniswapPairs[token] = pair;
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
        uint256 balance = _tEURxb.balanceOf(address(this));
        if (balance > 0) {
            _tEURxb.transfer(_msgSender(), balance);
        }
        _isClosedContract = true;
    }

    /**
     * @dev Adding liquidity
     * @param token address
     * @param amount number of tokens
     */
    function addLiquidity(address token, uint256 amount) external {
        if (token == _tUSDC || _token == _tDAI) {
            _addLiquidityBalancer(_msgSender(), token, amount);
        } else {
            _addLiquidityUniswap(_msgSender(), token, amount);
        }
    }

    /**
     * @dev Adds liquidity for USDT-EURxb and BUSD-EURxb pairs
     * @param token address
     * @param amount number of tokens
     */
    function _addLiquidityUniswap(address sender, address token, uint256 amount) internal {
        require(now >= _startTime, "The time has not come yet");
        require(!_isClosedContract, "Contract closed");

        TransferHelper.safeTransferFrom(token, sender, address(this), amount);

        address pairAddress = _uniswapPairs[token];
        require(pairAddress != address(0), "Unsupported token");
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);

        uint256 totalSupply = pair.totalSupply();

        uint256 exchangeTokens = amount.div(2);
        (uint256 tokenRatio, uint256 eurRatio) = getUinswapReservesRatio(token);

        uint256 amountEUR = exchangeTokens.mul(eurRatio).div(tokenRatio);
        uint256 balanceEUR = _tEURxb.balanceOf(address(this));

        require(balanceEUR >= amountEUR, "not enough eur balance");

        exchange(token, exchangeTokens);

        TransferHelper.safeApprove(token, pair, exchangeTokens);
        _tEURxb.approve(pair, amountEUR);

        (uint amountA, uint amountB, uint amountBPT) = _uniswapRouter.addLiquidity(
            token,
            address(_tEURxb),
            exchangeTokens, // token A
            amountEUR,      // token B
            0,
            0,
            address(this), // mint BPT to router, not user
            now + 2 minutes // deadline 2 minutes
        );

        // should we check if amount is less than taken from user?
        if (amountA < exchangeTokens) {
            // send back the difference
            uint256 difference = exchangeTokens.sub(amountA);
            TransferHelper.safeTransferFrom(token, address(this), sender, difference);
        }

        if (amountB < amountEUR) {
            // send back the difference
            uint256 difference = amountEUR.sub(amountB);
            TransferHelper.safeTransferFrom(address(_tEURxb), address(this), sender, difference);
        }

        // reward user with BPT
        if (_startTime + 7 days < now) {
            TransferHelper.safeTransfer(address(this), sender, amountBPT);
        } else {
            // TODO: refactor stakingManager to use uniswap pairs as well
//            IStakingManager manager = IStakingManager(_stakingManager);
//            TransferHelper.safeApprove(address(this), _stakingManager, amountBPT);
//            manager.addStaker(sender, address(this), amountBPT);
        }
    }

    function _addLiquidityBalancer(address sender, address token, uint256 amount) internal {
        require(now >= _startTime, "The time has not come yet");
        require(!_isClosedContract, "Contract closed");

        // transfer user tokens to router
        TransferHelper.safeTransferFrom(token, sender, address(this), amount);

        address poolAddress = _balancerPools[token];
        IBalancerPool pool = IBalancerPool(poolAddress);
        uint256 totalSupply = pool.totalSupply();

        uint256 userExchangeTokens = amount.div(2);
        uint256 userEurAmount = userExchangeTokens.mul(23).div(27);
        uint256 routerEurBalance = _tEURxb.balanceOf(address(this));

        uint256 amountBPT;

        if (routerEurBalance >= userEurAmount) {
            exchange(token, userExchangeTokens);

            TransferHelper.safeApprove(token, poolAddress, userExchangeTokens);
            _tEURxb.approve(poolAddress, userEurAmount);

            uint256 balance = pool.getBalance(_tEURxb);
            uint256 memory SAFETY_MULTIPLIER = 10**18;
            uint256 ratio = userEurAmount.mul(SAFETY_MULTIPLIER).div(balance);
            amountBPT = totalSupply.mul(ratio).div(SAFETY_MULTIPLIER);
            amountBPT = amountBPT.mul(99).div(100);

            uint256[] memory data = new uint256[](2);
            data[0] = userEurAmount;
            data[1] = userExchangeTokens;
            pool.joinPool(amountBPT, data);
        } else {
            TransferHelper.safeApprove(token, poolAddress, amount);

            uint256 tokenBalanceIn = pool.getBalance(token);
            uint256 tokenWeightIn = pool.getDenormalizedWeight(token);
            uint256 totalWeight = pool.getTotalDenormalizedWeight();
            uint256 tokenAmountIn = amount;
            uint256 swapFee = pool.getSwapFee();

            amountBPT = pool.calcPoolOutGivenSingleIn(
                tokenBalanceIn,
                tokenWeightIn,
                totalSupply,
                totalWeight,
                tokenAmountIn,
                swapFee
            );
            pool.joinswapExternAmountIn(token, amount, amountBPT);
        }

        if (_startTime + 7 days < now) {
            TransferHelper.safeTransfer(poolAddress, sender, amountBPT);
        } else {
            IStakingManager manager = IStakingManager(_stakingManager);
            TransferHelper.safeApprove(poolAddress, _stakingManager, amountBPT);
            manager.addStaker(sender, poolAddress, amountBPT);
        }
    }

    function getUinswapReservesRatio(address token)
        internal
        view
        returns (uint256 tokenRes, uint256 eurRes)
    {
        (uint112 res0, uint112 res1, ) = IUniswapV2Pair(_uniswapPairs[token]).getReserves();
        if (res0 == 0 || res1 == 0) {
            (tokenRes, eurRes) = (27, 23);
        } else {
            (address token0, ) = UniswapV2Library.sortTokens(token, address(_tEURxb));
            (tokenRes, eurRes) = (token == res0) ? (res0, res1) : (res1, res0);
        }
    }

    function getBalancerReservesRatio(address token)
        internal
        view
        returns (uint256, uint256)
    {
        return (27, 23);
    }

    /**
     * @dev Exchange of tokens for EURxb
     * @param token token address
     * @param amount number of tokens
     */
    function exchange(address token, uint256 amount) public {
        require(!_isClosedContract, "Contract closed");
        require(
            token == _tUSDT || token == _tUSDC || token == _tBUSD || token == _tDAI,
            "Token not found"
        );

        uint256 reserve0;
        uint256 reserve1;

        if (token == _tUSDT || token == _TBUSD) {
            (reserve0, reserve1) = getUinswapReservesRatio(token);
        } else {
            (reserve0, reserve1) = getBalancerReservesRatio(token);
        }

        uint256 amountEUR = amount.mul(reserve1).div(reserve0);

        uint256 routerEurBalance = _tEURxb.balanceOf(address(this));
        require(routerEurBalance >= amountEUR, "Not enough tokens");

        // transfer tokens from user to team
        TransferHelper.safeTransferFrom(token, _msgSender(), _teamAddress, amount);
        // give him euro in exchange
        if (_msgSender() != address(this)) {
            _tEURxb.transfer(_msgSender(), amountEUR);
        }
    }
}
