pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


/**
 * @title StakingManager
 * @dev Staking manager contract
 */
contract StakingManager is Ownable {
    using SafeMath for uint256;

    struct Stake {
        address user;
        address pool;
        uint256 weightedBPT;
    }

    struct Reward {
        uint256 bptBalance;
        uint256 rewardsGEuro;
    }

    Stake[] private _weightStakers;

    mapping(address => mapping(address => Reward)) private _stakers; // user address => pool address => reward
    mapping(address => uint256) private _poolBPTWeight; // pool address => weighted amount of BPT
    mapping(address => bool) private _balancerPools; // balancer pool address => status

    bool private _isFrozen;
    address private _tGEuro;
    uint256 private _startTime;
    uint256 private _bonusWeight;

    uint256 private _totalGEuro = 10000 ether;

    uint256 private _unfreezeShift = 0;

    constructor(
        address tGEuro,
        uint256 startTime,
        uint256 bonusWeight
    ) public {
        require(bonusWeight >= 100, "Weight must be over 100");
        _isFrozen = true;
        _tGEuro = tGEuro;
        _startTime = startTime;
        _bonusWeight = bonusWeight;
    }

    /**
     * @return are the tokens frozen
     */
    function isFrozen() external view returns (bool) {
        return _isFrozen;
    }

    /**
     * @return start time
     */
    function startTime() external view returns (uint256) {
        return _startTime;
    }

    /**
     * @return bonus weight
     */
    function bonusWeight() external view returns (uint256) {
        return _bonusWeight;
    }

    /**
     * @dev return the number of tokens from the staker
     * @param staker user address
     * @param pool address
     */
    function getRewardInfo(address staker, address pool)
        external
        view
        returns (uint256 bptBalance, uint256 gEuroBalance)
    {
        bptBalance = _stakers[staker][pool].bptBalance;
        gEuroBalance = _stakers[staker][pool].rewardsGEuro;
    }

    /**
     * @dev Set balancer pool
     * @param pool address
     */
    function setBalancerPool(address pool) external onlyOwner {
        _balancerPools[pool] = true;
    }

    /**
     * @dev Unfreeze BPT tokens
     */
    function unfreezeTokens() external onlyOwner {
        require(_startTime + 7 days < now, "Time is not over");
        require(
            IERC20(_tGEuro).balanceOf(address(this)) >= _totalGEuro,
            "Insufficient gEuro balance"
        );
        require(_isFrozen, "Tokens unfrozen");

        for (
            uint256 i = _unfreezeShift;
            i < _weightStakers.length && i < _unfreezeShift + 100;
            i++
        ) {
            address user = _weightStakers[i].user;
            address pool = _weightStakers[i].pool;

            uint256 weightedBPT = _weightStakers[i].weightedBPT;

            uint256 poolBPTWeight = _poolBPTWeight[pool];
            uint256 percent = weightedBPT.mul(10**18).div(poolBPTWeight);

            uint256 poolGEuro = _totalGEuro.div(4);
            uint256 amountGEuro = percent.mul(poolGEuro).div(10**18);

            _stakers[user][pool].rewardsGEuro = _stakers[user][pool]
                .rewardsGEuro
                .add(amountGEuro);
        }

        _unfreezeShift = _unfreezeShift + 100;

        if (_unfreezeShift >= _weightStakers.length) {
            _isFrozen = false;
        }
    }

    /**
     * @dev Add staker
     * @param staker user address
     * @param amount number of BPT tokens
     */
    function addStaker(address staker, address pool, uint256 amount)
        external
    {
        require(now >= _startTime, "The time has not come yet");
        require(_balancerPools[pool], "Balancer pool not found");
        IERC20(pool).transferFrom(_msgSender(), address(this), amount);
        _stakers[staker][pool].bptBalance = _stakers[staker][pool]
            .bptBalance
            .add(amount);

        if (now <= _startTime + 3 days) {
            uint256 weightedBPT = amount.mul(_bonusWeight).div(100);
            _weightStakers.push(Stake(staker, pool, weightedBPT));
            _poolBPTWeight[pool] = _poolBPTWeight[pool].add(weightedBPT);
        } else {
            _weightStakers.push(Stake(staker, pool, amount));
            _poolBPTWeight[pool] = _poolBPTWeight[pool].add(amount);
        }
    }

    /**
     * @dev Pick up BPT
     */
    function claimBPT(address pool) external {
        // TODO: maybe remove the parameter
        require(!_isFrozen, "Tokens frozen");
        uint256 amountBPT = _stakers[_msgSender()][pool].bptBalance;
        require(amountBPT > 0, "Staker doesn't exist");
        _stakers[_msgSender()][pool].bptBalance = 0;
        IERC20(pool).transfer(_msgSender(), amountBPT);

        uint256 amountGEuro = _stakers[_msgSender()][pool].rewardsGEuro;
        _stakers[_msgSender()][pool].rewardsGEuro = 0;
        if (amountGEuro > 0) {
            IERC20(_tGEuro).transfer(_msgSender(), amountGEuro);
        }
    }
}
