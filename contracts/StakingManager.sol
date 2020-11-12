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

    struct Weight {
        address user;
        address pool;
        uint256 weight;
        uint256 bptBalance;
    }
    Weight[] private _weightStakers;

    struct Staker {
        uint256 bptBalance;
        uint256 rewardsGEuro;
    }
    mapping(address => mapping(address => Staker)) private _stakers;
    mapping(address => uint256) private _poolBPTWeight;

    bool private _isFrozen;
    address private _tGEuro;
    uint256 private _startTime;
    uint256 private _weight;

    uint256 private _totalGEuro = 10000 ether;

    constructor(
        address tGEuro,
        uint256 startTime,
        uint256 weight
    ) public {
        _isFrozen = true;
        _tGEuro = tGEuro;
        _startTime = startTime;
        _weight = weight;
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
     * @return weight
     */
    function weight() external view returns (uint256) {
        return _weight;
    }

    /**
     * @return number of BPT tokens from the staker
     */
    function getNumberBPTTokens(address staker, address pool)
        external
        view
        returns (uint256)
    {
        return _stakers[staker][pool].bptBalance;
    }

    /**
     * @return number of gEuro tokens from the staker
     */
    function getNumberGEuroTokens(address staker, address pool)
        external
        view
        returns (uint256)
    {
        return _stakers[staker][pool].rewardsGEuro;
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

        _isFrozen = false;

        for (uint256 i = 0; i < _weightStakers.length; i++) {
            address user = _weightStakers[i].user;
            address pool = _weightStakers[i].pool;

            uint256 weightStaker = _weightStakers[i].weight;
            uint256 amountBPT = _weightStakers[i]
                .bptBalance
                .mul(weightStaker)
                .div(100);

            uint256 poolBPTWeight = _poolBPTWeight[pool];
            uint256 percent = amountBPT.mul(10**18).div(poolBPTWeight);

            uint256 poolGEuro = _totalGEuro.div(4);
            uint256 amountGEuro = percent.mul(poolGEuro).div(10**18);

            _stakers[user][pool].rewardsGEuro = _stakers[user][pool]
                .rewardsGEuro
                .add(amountGEuro);
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
        IERC20(pool).transferFrom(msg.sender, address(this), amount);
        _stakers[staker][pool].bptBalance = _stakers[staker][pool]
            .bptBalance
            .add(amount);

        if (now <= _startTime + 3 days) {
            _weightStakers.push(
                Weight(
                    staker,
                    pool,
                    _weight,
                    amount)
                );
            _poolBPTWeight[pool] = _poolBPTWeight[pool].add(
                amount.mul(_weight).div(100)
            );
        } else {
            _weightStakers.push(
                Weight(
                    staker,
                    pool,
                    100,
                    amount)
                );
            _poolBPTWeight[pool] = _poolBPTWeight[pool].add(amount);
        }
    }

    /**
     * @dev Pick up BPT
     */
    function claimBPT(address pool) external {
        require(!_isFrozen, "Tokens frozen");
        uint256 amountBPT = _stakers[msg.sender][pool].bptBalance;
        require(amountBPT > 0, "Staker doesn't exist");
        _stakers[msg.sender][pool].bptBalance = 0;
        IERC20(pool).transfer(msg.sender, amountBPT);

        uint256 amountGEuro = _stakers[msg.sender][pool].rewardsGEuro;
        _stakers[msg.sender][pool].rewardsGEuro = 0;
        if (amountGEuro > 0) {
            IERC20(_tGEuro).transfer(msg.sender, amountGEuro);
        }
    }
}
