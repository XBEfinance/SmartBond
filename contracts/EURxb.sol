pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ERC20.sol";
import "./lib/LinkedList.sol";


/**
 * @title EURxb
 * @dev EURxb token
 */
contract EURxb is ERC20 {
    using SafeMath for uint256;
    using Address for address;

    uint256 private _unit = 10**18;

    uint256 private _totalActiveValue;
    uint256 private _annualInterest;
    uint256 private _accrualTimestamp;
    uint256 private _expIndex;

    uint256 private _secondsRatio = _unit.mul(365).mul(86400);

    mapping(address => uint256) private _holderIndex;

    constructor() public ERC20("EURxb", "EURxb") {
        _annualInterest = 7 * 10**16;
        _expIndex = _unit;
    }

    /**
     * @dev Return user balance
     * @param account user address
     */
    function balanceOf(address account) public override view returns (uint256) {
        return balanceByTime(account, block.timestamp);
    }

    /**
     * @dev User balance calculation
     * @param account user address
     * @param timestamp date
     */
    function balanceByTime(address account, uint256 timestamp)
        public
        view
        returns (uint256)
    {
        if (_balances[account] > 0 && _holderIndex[account] > 0) {
            uint256 newExpIndex = _calculateInterest(
                timestamp,
                _annualInterest,
                _expIndex
            );
            return
                _balances[account].mul(newExpIndex).div(_holderIndex[account]);
        }
        return super.balanceOf(account);
    }

    /**
     * @dev Calculation of accrued interest
     */
    function accrueInterest() public {
        // TODO
        _expIndex = _calculateInterest(
            block.timestamp,
            _annualInterest,
            _expIndex
        );
        _accrualTimestamp = block.timestamp;
    }

    /**
     * @dev Mint tokens
     * @param account user address
     * @param amount number of tokens
     */
    function mint(address account, uint256 amount) public {
        super._mint(account, amount);
    }

    /**
     * @dev Calculate interest
     * @param timestampNow the current date
     * @param interest percent
     * @param prevIndex previous index
     */
    function _calculateInterest(uint256 timestampNow, uint256 interest, uint256 prevIndex)
        internal
        view
        returns (uint256)
    {
        uint256 period = timestampNow.sub(_accrualTimestamp);
        if (period < 60) {
            return prevIndex;
        }
        uint256 interestFactor = interest.mul(period);
        uint256 newExpIndex = (interestFactor.mul(prevIndex).div(_secondsRatio))
            .add(prevIndex);
        return newExpIndex;
    }

    /**
     * @dev Update user balance
     * @param account user address
     */
    function _updateBalance(address account) internal {
        if (_holderIndex[account] > 0) {
            uint256 newBalance = _balances[account].mul(_expIndex).div(
                _holderIndex[account]
            );
            uint256 delta = newBalance.sub(_balances[account]);

            if (delta != 0) {
                _balances[account] = newBalance;
            }
        }
        _holderIndex[account] = _expIndex;
    }

    /**
     * @dev Before token transfer
     * @param from address
     * @param to address
     * @param amount number of tokens
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        accrueInterest();
        if (from != address(0)) {
            _updateBalance(from);
        }
        if (to != address(0)) {
            _updateBalance(to);
        }
        super._beforeTokenTransfer(from, to, amount);
    }
}
