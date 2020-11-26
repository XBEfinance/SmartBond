pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ERC20.sol";
import "./libs/LinkedList.sol";


/**
 * @title EURxb
 * @dev EURxb token
 */
contract EURxb is ERC20, Ownable {
    using SafeMath for uint256;
    using Address for address;
    using LinkedList for LinkedList.List;

    LinkedList.List private _list;

    uint256 private _unit = 10**18;
    uint256 private _perYear = _unit.mul(365).mul(86400);

    uint256 private _countMaturity;
    uint256 private _totalActiveValue;
    uint256 private _annualInterest;
    uint256 private _accrualTimestamp;
    uint256 private _expIndex;

    mapping(address => uint256) private _holderIndex;

    constructor() public ERC20("EURxb", "EURxb") {
        _annualInterest = 7 * 10**16;
        _expIndex = _unit;
        _countMaturity = 100;
    }

    /**
     * @dev Return totalActiveValue
     */
    function totalActiveValue() public view returns (uint256) {
        return _totalActiveValue;
    }

    /**
     * @dev Return accrualTimestamp
     */
    function accrualTimestamp() public view returns (uint256) {
        return _accrualTimestamp;
    }

    /**
     * @dev Return expIndex
     */
    function expIndex() public view returns (uint256) {
        return _expIndex;
    }

    /**
     * @dev Return first added maturity
     */
    function getFirstMaturity() public view returns (uint256) {
        uint256 head = _list.getHead();
        uint256 maturityEnd;
        (, maturityEnd, , ) = _list.getNodeValue(head);
        return maturityEnd;
    }

    /**
     * @dev Return last added maturity
     */
    function getLastMaturity() public view returns (uint256) {
        uint256 end = _list.getEnd();
        uint256 maturityEnd;
        (, maturityEnd, , ) = _list.getNodeValue(end);
        return maturityEnd;
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
            uint256 tempTotalActiveValue = _totalActiveValue;
            uint256 head = _list.getHead();
            while (_list.listExists()) {
                uint256 amount;
                uint256 maturityEnd;
                uint256 next;
                (amount, maturityEnd, , next) = _list.getNodeValue(head);

                if (next == 0) {
                    break;
                }

                if (maturityEnd <= now) {
                    tempTotalActiveValue = tempTotalActiveValue.sub(amount);
                } else {
                    break;
                }

                head = next;
            }
            uint256 newExpIndex = _calculateInterest(
                timestamp,
                _annualInterest.mul(tempTotalActiveValue),
                _expIndex
            );
            return
                _balances[account].mul(newExpIndex).div(_holderIndex[account]);
        }
        return super.balanceOf(account);
    }

    /**
     * @dev Set countMaturity
     */
    function setCountMaturity(uint256 count) public onlyOwner {
        _countMaturity = count;
    }

    /**
     * @dev Calculation of accrued interest
     */
    function accrueInterest() public {
        for (uint256 i = 0; i < _countMaturity && _list.listExists(); i++) {
            uint256 head = _list.getHead();
            uint256 amount;
            uint256 maturityEnd;
            uint256 next;
            (amount, maturityEnd, , next) = _list.getNodeValue(head);

            if (next == 0) {
                break;
            }

            if (maturityEnd <= now) {
                _totalActiveValue = _totalActiveValue.sub(amount);
                _list.setHead(next);
            } else {
                break;
            }
        }

        _expIndex = _calculateInterest(
            block.timestamp,
            _annualInterest.mul(_totalActiveValue),
            _expIndex
        );

        _accrualTimestamp = block.timestamp;
    }

    /**
     * @dev Added new maturity
     * @param amount number of tokens
     * @param maturityEnd end date of interest accrual
     */
    function addNewMaturity(uint256 amount, uint256 maturityEnd) public {
        _totalActiveValue = _totalActiveValue.add(amount);
        if (_list.listExists()) {
            uint256 id = _list.getEnd();

            // TODO: maybe many elements
            // TODO: maybe you need to add close dates
            while (true) {
                uint256 maturityNode;
                uint256 prevIDNode;
                (, maturityNode, prevIDNode, ) = _list.getNodeValue(id);

                if (maturityNode < maturityEnd) {
                    _list.pushBack(amount, maturityEnd);
                    break;
                }

                if (prevIDNode == 0) {
                    _list.pushBefore(id, amount, maturityEnd);
                    break;
                }

                uint256 maturityPrevNode;
                (, maturityPrevNode, , ) = _list.getNodeValue(prevIDNode);

                if (maturityPrevNode < maturityEnd && maturityEnd < maturityNode) {
                    _list.pushBefore(id, amount, maturityEnd);
                    break;
                }

                id = prevIDNode;
            }
        } else {
            _list.pushBack(amount, maturityEnd);
        }
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
        uint256 newExpIndex = prevIndex;
        if (totalSupply() > 0) {
            uint256 period = timestampNow.sub(_accrualTimestamp);
            if (period < 60) {
                return prevIndex;
            }
            uint256 interestFactor = interest.mul(period);
            newExpIndex = (interestFactor.mul(prevIndex).div(_perYear).div(totalSupply()))
                .add(prevIndex);
        }
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
