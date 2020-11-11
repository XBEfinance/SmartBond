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

    struct Staker {
        address user;
        uint256 time;
        uint256 bptBalance;
    }

    Staker[] private _stakers;
    mapping(address => uint256) private _stakesBPT;
    mapping(address => uint256) private _rewardsGEuro;

    bool private _isFrozen;
    uint256 private _startTime;
    address private _tBPT;
    address private _tGEuro;
    address private _operatorAddress;

    uint256 private _totalGEuro = 10000 ether;
    uint256 private _percentFirst3Days;
    uint256 private _first3DaysStake;
    uint256 private _otherDaysStake;

    modifier onlyOperator() {
        require(
            _msgSender() == owner() || _msgSender() == _operatorAddress,
            "Caller is not the operator"
        );
        _;
    }

    constructor(
        address tBPT,
        address tGEuro,
        uint256 startTime,
        uint256 percent
    ) public {
        _isFrozen = true;
        _startTime = startTime;
        _tBPT = tBPT;
        _tGEuro = tGEuro;
        _percentFirst3Days = percent;
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
     * @return percents
     */
    function percents() external view returns (uint256[2] memory) {
        return [_percentFirst3Days, 100 - _percentFirst3Days];
    }

    /**
     * @return stakes by days
     */
    function stakesByDays() external view returns (uint256[2] memory) {
        return [_first3DaysStake, _otherDaysStake];
    }

    /**
     * @return number of BPT tokens from the staker
     */
    function getNumberBPTTokens(address staker) external view returns (uint256) {
        return _stakesBPT[staker];
    }

    /**
     * @return number of gEuro tokens from the staker
     */
    function getNumberGEuroTokens(address staker) external view returns (uint256) {
        return _rewardsGEuro[staker];
    }

    /**
     * @return operator address
     */
    function operatorAddress() external view returns (address) {
        return _operatorAddress;
    }

    /**
     * @dev set operator address
     * @param operator address
     */
    function setOperatorAddress(address operator) external onlyOwner {
        require(operator != address(0), "The zero operator address");
        _operatorAddress = operator;
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
        uint256 gEuroFirst3Days = _totalGEuro.mul(_percentFirst3Days).div(100);
        uint256 lastDaysGEuro = _totalGEuro.sub(gEuroFirst3Days);

        for (uint256 i = 0; i < _stakers.length; i++) {
            if (_stakers[i].time <= _startTime + 3 days) {
                uint256 percent = _stakers[i].bptBalance.mul(10**18).div(
                    _first3DaysStake
                );
                uint256 amountGEuro = percent.mul(gEuroFirst3Days).div(10**18);
                _rewardsGEuro[_stakers[i].user] = _rewardsGEuro[_stakers[i]
                    .user]
                    .add(amountGEuro);
            } else {
                uint256 percent = _stakers[i].bptBalance.mul(10**18).div(
                    _otherDaysStake
                );
                uint256 amountGEuro = percent.mul(lastDaysGEuro).div(10**18);
                _rewardsGEuro[_stakers[i].user] = _rewardsGEuro[_stakers[i]
                    .user]
                    .add(amountGEuro);
            }
        }
    }

    /**
     * @dev Add staker
     * @param staker user address
     * @param amount number of BPT tokens
     */
    function addStaker(address staker, uint256 amount) external onlyOperator {
        IERC20(_tBPT).transferFrom(msg.sender, address(this), amount);
        _stakers.push(Staker(staker, now, amount));
        _stakesBPT[staker] = _stakesBPT[staker].add(amount);

        if (now <= _startTime + 3 days) {
            _first3DaysStake = _first3DaysStake.add(amount);
        } else {
            _otherDaysStake = _otherDaysStake.add(amount);
        }
    }

    /**
     * @dev Pick up BPT
     */
    function claimBPT() external {
        require(!_isFrozen, "Tokens frozen");
        uint256 amountBPT = _stakesBPT[msg.sender];
        require(amountBPT > 0, "Staker doesn't exist");
        _stakesBPT[msg.sender] = 0;
        IERC20(_tBPT).transfer(msg.sender, amountBPT);

        uint256 amountGEuro = _rewardsGEuro[msg.sender];
        _rewardsGEuro[msg.sender] = 0;
        if (amountGEuro > 0) {
            IERC20(_tGEuro).transfer(msg.sender, amountGEuro);
        }
    }
}
