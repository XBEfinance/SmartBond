pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/IBalancerPool.sol";
import "./interfaces/IStakingManager.sol";
import "./templates/Initializable.sol";

/**
 * @title Router
 * @dev Liquidity management contract
 */
contract Router is Ownable, Initializable {
    using SafeMath for uint256;

    /**
     * @dev informs that EURxb router balance is empty
     */
    event EmptyEURxbBalance();
    event LiquidityMinted(uint256 liquidity);

    address private _teamAddress;
    address private _stakingManager;
    uint256 private _startTime;
    address private _tUSDT;
    address private _tUSDC;
    address private _tBUSD;
    address private _tDAI;
    IERC20 private _tEURxb;

    IUniswapV2Router02 private _uniswapRouter;

    bool _isClosedContract = false;

    /// token address => balancer pool address
    mapping(address => address) private _balancerPools;
    /// token address => uniswap pair (token, eurxb) address
    mapping(address => address) private _uniswapPairs;

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
        _tEURxb = IERC20(tEURxb);
    }

    /**
     * @dev setup uniswap router
     */
    function configure(address uniswapRouter) external initializer {
        require(uniswapRouter != address(0), "invalid router address");
        _uniswapRouter = IUniswapV2Router02(uniswapRouter);
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
        if (token == _tUSDC || token == _tDAI) {
            _addLiquidityBalancer(_msgSender(), token, amount);
        } else if (token == _tUSDT || token == _tBUSD) {
            _addLiquidityUniswap(_msgSender(), token, amount);
        } else {
            revert("token is not supported");
        }
    }

    /**
     * @dev Adds liquidity for USDT-EURxb and BUSD-EURxb pairs
     * @param token address
     * @param amount number of tokens
     */
    function _addLiquidityUniswap(address sender, address token, uint256 amount) private {
        require(now >= _startTime, "The time has not come yet");
        require(!_isClosedContract, "Contract closed");

        address pairAddress = _uniswapPairs[token];
        require(pairAddress != address(0), "Unsupported token");
        IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);

        uint256 exchangeAmount = amount.div(2);
        (uint256 tokenRatio, uint256 eurRatio) = getUinswapReservesRatio(token);

        uint256 amountEUR = exchangeAmount.mul(eurRatio).div(tokenRatio);
        uint256 balanceEUR = _tEURxb.balanceOf(address(this));

        // check if we don't have enough eurxb tokens
        if (balanceEUR <= amountEUR) {
            amountEUR = balanceEUR;
            // we can take only that much
            exchangeAmount = amountEUR.mul(tokenRatio).div(eurRatio);
            emit EmptyEURxbBalance();
        }

        // take user tokens
        safeTransferFrom(
            token,
            sender, // client
            address(this), // router
            exchangeAmount.mul(2)
        );

        // exchange half of user tokens for eurxb
        amountEUR = _exchangeForEuroXB(token, exchangeAmount);

        // ensure balances
        ensureBalance(token, address(this), exchangeAmount);
        ensureBalance(address(_tEURxb), address(this), amountEUR);

        // approve transfer tokens and eurxbs to uniswap pair
        TransferHelper.safeApprove(token, pairAddress, exchangeAmount);
        TransferHelper.safeApprove(address(_tEURxb), pairAddress, amountEUR);

        //         finally transfer tokens and produce liquidity
//        (uint256 amountA, uint256 amountB, uint256 liquidityAmount) = _uniswapRouter
//        .addLiquidity(
//            address(_tEURxb),
//            token,
//            amountEUR, // token B
//            exchangeAmount, // token A
//            0, // min A amount
//            0, // min B amount
//            address(this), // mint liquidity to router, not user
//            now + 10 minutes // deadline 10 minutes
//        );

        // amountA and amountB should be very close to exchangeTokens and amountEUR
        // sending back rest of tokens doesn't seem to be necessarily
        // when amounts calculated properly, there is no change

        //        // send back the difference
        //        if (amountA < exchangeTokens) {
        //            TransferHelper.safeTransferFrom(
        //                token,
        //                address(this),
        //                sender,
        //                exchangeTokens.sub(amountA)
        //            );
        //        }
        //
        //        if (amountB < amountEUR) {
        //            TransferHelper.safeTransferFrom(
        //                address(_tEURxb),
        //                address(this),
        //                sender,
        //                amountEUR.sub(amountB)
        //            );
        //        }

        // reward user with liquidity
//        if (_startTime + 7 days < now) {
//            TransferHelper.safeTransfer(address(this), sender, liquidityAmount);
//        } else {
//            IStakingManager manager = IStakingManager(_stakingManager);
//            TransferHelper.safeApprove(address(this), _stakingManager, liquidityAmount);
//            manager.addStake(sender, pairAddress, liquidityAmount);
//        }
//
//        emit LiquidityMinted(liquidityAmount);
    }

    function calculateEuroAmount(address tokenAddress, uint256 tokenAmount) public view returns (uint256) {
        (uint256 tokenRes, uint256 eurRes) = getUinswapReservesRatio(tokenAddress);

        return tokenAmount.mul(eurRes).div(tokenRes);
    }

    function _addLiquidityBalancer(address sender, address token, uint256 amount) internal {
        require(now >= _startTime, "The time has not come yet");
        require(!_isClosedContract, "Contract closed");

        // transfer user tokens to router
        safeTransferFrom(token, sender, address(this), amount);

        address poolAddress = _balancerPools[token];
        IBalancerPool pool = IBalancerPool(poolAddress);
        uint256 totalSupply = pool.totalSupply();

        uint256 userExchangeTokens = amount.div(2);
        uint256 userEurAmount = userExchangeTokens.mul(23).div(27);
        uint256 routerEurBalance = _tEURxb.balanceOf(address(this));

        uint256 amountBPT;

        if (routerEurBalance >= userEurAmount) {
            exchangeForEuroXB(token, userExchangeTokens);

            TransferHelper.safeApprove(token, poolAddress, userExchangeTokens);
            TransferHelper.safeApprove(address(_tEURxb), poolAddress, userEurAmount);

            uint256 balance = pool.getBalance(address(_tEURxb));
            uint256 SAFETY_MULTIPLIER = 10 ** 18;
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
            manager.addStake(sender, poolAddress, amountBPT);
        }
    }

    /**
     * @dev returns uniswap pair reserves numbers or default numbers
     * used to get token/eurxb ratio
     */
    function getUinswapReservesRatio(address token)
    public view
    returns (uint256 tokenRes, uint256 eurRes)
    {
        (uint112 res0, uint112 res1,) = IUniswapV2Pair(_uniswapPairs[token]).getReserves();
        if (res0 == 0 || res1 == 0) {
            (tokenRes, eurRes) = (27, 23);
        } else {
            (address token0,) = sortTokens(token, address(_tEURxb));
            (tokenRes, eurRes) = (token == token0) ? (res0, res1) : (res1, res0);
        }
    }

    function _getUniswapReserves(address token)
    private view
    returns (uint256 tokenRes, uint256 eurRes)
    {
        (uint112 res0, uint112 res1,) = IUniswapV2Pair(_uniswapPairs[token]).getReserves();
        (address token0,) = sortTokens(token, address(_tEURxb));
        (tokenRes, eurRes) = (token == token0) ? (res0, res1) : (res1, res0);
    }

    /**
     * @dev returns balancer pair reserves numbers or default numbers
     * used to get token/eurxb ratio
     * guarantees, that returned numbers greater than zero
     */
    function getBalancerReservesRatio(address token)
    internal view
    returns (uint256, uint256)
    {
        address poolAddress = _balancerPools[token];
        require(poolAddress != address(0), "Invalid pool address");
        IBalancerPool pool = IBalancerPool(poolAddress);
        uint256 balanceEurXB = pool.getBalance(address(_tEURxb));
        uint256 balanceToken = pool.getBalance(token);

        if (balanceEurXB == 0 || balanceToken == 0) {
            return (27, 23);
        }

        return (balanceToken, balanceEurXB);
    }

    /**
     * @dev Exchange of tokens for EURxb
     * @param token token address
     * @param amount number of tokens
     */
    function exchangeForEuroXB(address token, uint256 amount) public returns (uint256) {
        require(!_isClosedContract, "Contract closed");
        require(
            token == _tUSDT || token == _tUSDC || token == _tBUSD || token == _tDAI,
            "Token not found"
        );

        uint256 reserve0;
        uint256 reserve1;

        if (token == _tUSDC || token == _tDAI) {
            (reserve0, reserve1) = getBalancerReservesRatio(token);
        } else {
            (reserve0, reserve1) = getUinswapReservesRatio(token);
        }

        uint256 amountEUR = amount.mul(reserve1).div(reserve0);

        uint256 routerEurBalance = _tEURxb.balanceOf(address(this));
        require(routerEurBalance >= amountEUR, "Not enough tokens");

        if (_msgSender() == address(this)) {
            TransferHelper.safeApprove(token, address(this), amount);
        }
        safeTransferFrom(token, _msgSender(), _teamAddress, amount);
        // give him euro in exchange
        if (_msgSender() != address(this)) {
            _tEURxb.transfer(_msgSender(), amountEUR);
        }

        return amountEUR;
    }

    function _exchangeForEuroXB(address token, uint256 amount) private returns (uint256) {
        require(!_isClosedContract, "Contract closed");
        require(
            token == _tUSDT || token == _tUSDC || token == _tBUSD || token == _tDAI,
            "Token not found"
        );

        uint256 reserve0;
        uint256 reserve1;

        if (token == _tUSDC || token == _tDAI) {
            (reserve0, reserve1) = getBalancerReservesRatio(token);
        } else {
            (reserve0, reserve1) = getUinswapReservesRatio(token);
        }

        uint256 amountEUR = amount.mul(reserve1).div(reserve0);

        uint256 routerEurBalance = _tEURxb.balanceOf(address(this));
        require(routerEurBalance >= amountEUR, "Not enough tokens");

        TransferHelper.safeApprove(token, address(this), amount);

        safeTransferFrom(token, address(this), _teamAddress, amount);

        return amountEUR;
    }

    function ensureBalance(address token, address user, uint256 value) internal {
        bytes4 balanceOf = bytes4(keccak256("balanceOf(address)"));
        (bool bsuccess, bytes memory bdata) = token.call(abi.encodeWithSelector(balanceOf, user));
        require(bsuccess, "balanceOf failed");
        uint256 balance = abi.decode(bdata, (uint256));
        require(balance >= value, 'not enough tokens');
    }

    function safeTransferFrom(address token, address from, address to, uint value) internal {
        ensureBalance(token, from, value);

        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'transferFrom failed');
    }

    /**
     * @dev sorts token addresses just like uniswap router does
     */
    function sortTokens(address tokenA, address tokenB)
    internal
    pure
    returns (address token0, address token1)
    {
        require(tokenA != tokenB, "identical tokens");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'zero address');
    }

    function quote(uint amountA, uint reserveA, uint reserveB) private pure returns (uint amountB) {
        require(amountA > 0, 'insufficient amount');
        require(reserveA > 0 && reserveB > 0, 'insufficient liquidity');
        amountB = amountA.mul(reserveB) / reserveA;
    }

    function calculateAmounts(
        address token,
        uint amountTokenDesired,
        uint amountEurxbDesired,
        uint amountAMin,
        uint amountBMin
    ) public returns (uint amountToken, uint amountEur)
    {
        (uint256 tokenRes, uint256 eurRes) = _getUniswapReserves(token);

        if (tokenRes == 0 && eurRes == 0) {
            (amountToken, amountEur) = (amountTokenDesired, amountEurxbDesired);
        } else {
            uint amountBOptimal = quote(amountTokenDesired, tokenRes, eurRes);
            if (amountBOptimal <= amountEurxbDesired) {
                require(amountBOptimal >= amountBMin, 'insufficient B amount');
                (amountToken, amountEur) = (amountTokenDesired, amountBOptimal);
            } else {
                uint amountAOptimal = quote(amountEurxbDesired, tokenRes, eurRes);
                assert(amountAOptimal <= amountTokenDesired);
                require(amountAOptimal >= amountAMin, 'insufficient A amount');
                (amountToken, amountEur) = (amountAOptimal, amountEurxbDesired);
            }
        }
    }
}
