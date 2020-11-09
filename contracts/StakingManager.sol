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
        uint256 bpt;
    }

    Staker[] _stakers;
    mapping(address => uint256) _stakesBPT;
    mapping(address => uint256) _rewardsGEuro;

    bool _isFrozen;
    uint256 _createTime;
    address _tBPT;
    address _tGEuro;

    uint256 _totalGEuro = 10000 ether; // TODO
    uint256 _percentFirst3Days = 60; // TODO
    uint256 _gEuroFirst3Days = _totalGEuro.mul(_percentFirst3Days).div(100);
    uint256 _lastDaysGEuro = _totalGEuro.sub(_gEuroFirst3Days);
    uint256 _first3DaysStake;
    uint256 _otherDaysStake;

    constructor(address tBPT, address tGEuro) public {
        _isFrozen = true;
        _createTime = now;
        _tBPT = tBPT;
        _tGEuro = tGEuro;
    }

    /**
     * @dev Unfreeze BPT tokens
     */
    function unfreezeTokens() public onlyOwner {
        require(_createTime + 7 days > now, "Time is not over");
        _isFrozen = false;
        for (uint256 i = 0; i < _stakers.length; i++) {
            if (_stakers[i].time <= _createTime + 3 days) {
                uint256 percent = _stakers[i].bpt.mul(100).div(
                    _first3DaysStake
                );
                uint256 amountGEuro = percent.mul(_gEuroFirst3Days).div(100);
                _rewardsGEuro[_stakers[i].user] = _rewardsGEuro[_stakers[i]
                    .user]
                    .add(amountGEuro);
            } else {
                uint256 percent = _stakers[i].bpt.mul(100).div(_otherDaysStake);
                uint256 amountGEuro = percent.mul(_lastDaysGEuro).div(100);
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
    function addStaker(address staker, uint256 amount) public onlyOwner {
        IERC20(_tBPT).transferFrom(msg.sender, address(this), amount);
        _stakers.push(Staker(msg.sender, now, amount));
        _stakesBPT[staker] = _stakesBPT[staker].add(amount);

        if (now <= _createTime + 3 days) {
            _first3DaysStake.add(amount);
        } else {
            _otherDaysStake.add(amount);
        }
    }

    /**
     * @dev Pick up BPT
     */
    function claimBPT() public {
        require(!_isFrozen, "Tokens frozen");
        uint256 amountBPT = _stakesBPT[msg.sender];
        require(amountBPT > 0, "Staker doesn't exist");
        IERC20(_tBPT).transfer(msg.sender, amountBPT);

        uint256 amountGEuro = _rewardsGEuro[msg.sender];
        if (amountGEuro > 0) {
            IERC20(_tGEuro).transfer(msg.sender, amountGEuro);
        }
    }
}
