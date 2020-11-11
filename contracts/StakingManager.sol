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
        uint256 weight;
        uint256 bptBalance;
    }
    Weight[] private _weightStakers;

    struct Staker {
        uint256 bptBalance;
        uint256 rewardsGEuro;
    }
    mapping(address => Staker) private _stakers;

    bool private _isFrozen;
    address private _tBPT;
    address private _tGEuro;
    uint256 private _startTime;
    uint256 private _weight;

    uint256 private _totalGEuro = 10000 ether;
    uint256 private _totalBPTWeight;

    constructor(
        address tBPT,
        address tGEuro,
        uint256 startTime,
        uint256 weight
    ) public {
        _isFrozen = true;
        _tBPT = tBPT;
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
    function getNumberBPTTokens(address staker)
        external
        view
        returns (uint256)
    {
        return _stakers[staker].bptBalance;
    }

    /**
     * @return number of gEuro tokens from the staker
     */
    function getNumberGEuroTokens(address staker)
        external
        view
        returns (uint256)
    {
        return _stakers[staker].rewardsGEuro;
    }

    /**
     * @dev Unfreeze BPT tokens
     */
    function unfreezeTokens() external onlyOwner {
        require(_startTime + 7 days < now, "Time is not over");
        require(
            IERC20(_tGEuro).balanceOf(address(this)) >= _totalGEuro,
            "insufficient gEuro balance"
        );

        _isFrozen = false;

        for (uint256 i = 0; i < _weightStakers.length; i++) {
            uint256 weightStaker = _weightStakers[i].weight;
            uint256 amountBPT = _weightStakers[i]
                .bptBalance
                .mul(weightStaker)
                .div(100);
            uint256 percent = amountBPT.mul(10**18).div(_totalBPTWeight);

            uint256 amountGEuro = percent.mul(_totalGEuro).div(10**18);
            _stakers[_weightStakers[i].user]
                .rewardsGEuro = _stakers[_weightStakers[i].user]
                .rewardsGEuro
                .add(amountGEuro);
        }
    }

    /**
     * @dev Add staker
     * @param staker user address
     * @param amount number of BPT tokens
     */
    function addStaker(address staker, uint256 amount) external {
        IERC20(_tBPT).transferFrom(msg.sender, address(this), amount);
        _stakers[staker].bptBalance = _stakers[staker].bptBalance.add(amount);

        if (now <= _startTime + 3 days) {
            _weightStakers.push(Weight(staker, _weight, amount));
            _totalBPTWeight = _totalBPTWeight.add(amount.mul(_weight).div(100));
        } else {
            _weightStakers.push(Weight(staker, 100, amount));
            _totalBPTWeight = _totalBPTWeight.add(amount);
        }
    }

    /**
     * @dev Pick up BPT
     */
    function claimBPT() external {
        require(!_isFrozen, "Tokens frozen");
        uint256 amountBPT = _stakers[msg.sender].bptBalance;
        require(amountBPT > 0, "Staker doesn't exist");
        _stakers[msg.sender].bptBalance = 0;
        IERC20(_tBPT).transfer(msg.sender, amountBPT);

        uint256 amountGEuro = _stakers[msg.sender].rewardsGEuro;
        _stakers[msg.sender].rewardsGEuro = 0;
        if (amountGEuro > 0) {
            IERC20(_tGEuro).transfer(msg.sender, amountGEuro);
        }
    }
}
