pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/IEURxb.sol";
import "./libraries/LinkedList.sol";
import "./templates/Initializable.sol";
import "./templates/OverrideERC20.sol";

import { TokenAccessRoles } from "./libraries/TokenAccessRoles.sol";


/**
 * @title EURxb
 * @dev EURxb token
 */
contract EURxb is AccessControl, OverrideERC20, IEURxb, Initializable {
    using SafeMath for uint256;
    using Address for address;
    using LinkedList for LinkedList.List;

    LinkedList.List private _list;

    address private _ddp;

    uint256 private _unit = 10**18;
    uint256 private _perYear = _unit.mul(365).mul(86400);

    uint256 private _countMaturity;
    uint256 private _totalActiveValue;
    uint256 private _annualInterest;
    uint256 private _accrualTimestamp;
    uint256 private _expIndex;

    mapping(address => uint256) private _holderIndex;
    mapping(uint256 => uint256) private _deleteMaturity;

    constructor(address admin) public OverrideERC20("EURxb", "EURxb") {
        _annualInterest = 7 * 10**16;
        _expIndex = _unit;
        _countMaturity = 100;

        _setupRole(TokenAccessRoles.admin(), admin);
    }

    function configure(address ddp) external initializer {
        _ddp = ddp;

        _setupRole(TokenAccessRoles.minter(), ddp);
        _setupRole(TokenAccessRoles.burner(), ddp);
    }

    /**
     * @dev Return countMaturity
     */
    function countMaturity() external view returns (uint256) {
        return _countMaturity;
    }

    /**
     * @dev Return totalActiveValue
     */
    function totalActiveValue() external view returns (uint256) {
        return _totalActiveValue;
    }

    /**
     * @dev Return annualInterest
     */
    function annualInterest() external view returns (uint256) {
        return _annualInterest;
    }

    /**
     * @dev Return accrualTimestamp
     */
    function accrualTimestamp() external view returns (uint256) {
        return _accrualTimestamp;
    }

    /**
     * @dev Return expIndex
     */
    function expIndex() external view returns (uint256) {
        return _expIndex;
    }

    /**
     * @dev Return first added maturity
     */
    function getFirstMaturity() external view returns (uint256) {
        uint256 head = _list.getHead();
        (, uint256 maturityEnd, , ) = _list.getNodeValue(head);
        return maturityEnd;
    }

    /**
     * @dev Return last added maturity
     */
    function getLastMaturity() external view returns (uint256) {
        uint256 end = _list.getEnd();
        (, uint256 maturityEnd, , ) = _list.getNodeValue(end);
        return maturityEnd;
    }

    /**
     * @dev Set countMaturity
     * @param count maturity
     */
    function setCountMaturity(uint256 count) external {
        require(
            hasRole(TokenAccessRoles.admin(), _msgSender()),
            "Caller is not an admin"
        );
        require(count > 0, "The amount must be greater than zero");
        _countMaturity = count;
    }

    /**
     * @dev Mint tokens
     * @param account user address
     * @param amount number of tokens
     */
    function mint(address account, uint256 amount) external override {
        require(
            hasRole(TokenAccessRoles.minter(), _msgSender()),
            "Caller is not an minter"
        );

        accrueInterest();
        if (account != address(0)) {
            _updateBalance(account);
        }
        super._mint(account, amount);
    }

    /**
     * @dev Burn tokens
     * @param account user address
     * @param amount number of tokens
     */
    function burn(address account, uint256 amount) external override {
        require(
            hasRole(TokenAccessRoles.burner(), _msgSender()),
            "Caller is not an burner"
        );

        accrueInterest();
        if (account != address(0)) {
            _updateBalance(account);
        }
        super._burn(account, amount);
    }

    /**
     * @dev Added new maturity
     * @param amount number of tokens
     * @param maturityEnd end date of interest accrual
     */
    function addNewMaturity(uint256 amount, uint256 maturityEnd) external {
        require(_msgSender() == _ddp, "Caller is not allowed to addNewMaturity");
        require(amount > 0, "The amount must be greater than zero");
        require(maturityEnd > 0, "End date must be greater than zero");

        _totalActiveValue = _totalActiveValue.add(amount);

        if (_list.listExists()) {
            uint256 id = _list.getEnd();

            // TODO: maybe many elements
            // TODO: maybe you need to add close dates
            while (true) {
                (, uint256 maturityNode, uint256 prevIDNode, ) = _list.getNodeValue(id);

                if (maturityNode == maturityEnd) {
                    _list.updateElementAmount(id, amount);
                    break;
                }

                if (maturityNode < maturityEnd) {
                    _list.pushBack(amount, maturityEnd);
                    break;
                }

                if (id == _list.getHead() && maturityNode > maturityEnd) {
                    _list.pushBefore(id, amount, maturityEnd);
                    uint256 newPrev;
                    (, , newPrev, ) = _list.getNodeValue(id);
                    _list.setHead(newPrev);
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
     * @dev Remove maturity
     * @param amount number of tokens
     * @param maturityEnd end date of interest accrual
     */
    function removeMaturity(uint256 amount, uint256 maturityEnd) external {
        require(_msgSender() == _ddp, "Caller is not allowed to removeMaturity");
        require(amount > 0, "The amount must be greater than zero");
        require(maturityEnd > 0, "End date must be greater than zero");
        require(_list.listExists(), "The list does not exist");

        _totalActiveValue = _totalActiveValue.sub(amount);
        _deleteMaturity[maturityEnd] = _deleteMaturity[maturityEnd].add(amount);
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
                (uint256 amount, uint256 maturityEnd, , uint256 next) = _list.getNodeValue(head);

                if (next == 0) {
                    break;
                }

                if (maturityEnd <= now) {
                    uint256 deleteAmount = _deleteMaturity[maturityEnd];
                    tempTotalActiveValue = tempTotalActiveValue.sub(amount.sub(deleteAmount));
                    head = next;
                } else {
                    break;
                }
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
     * @dev Calculation of accrued interest
     */
    function accrueInterest() public {
        for (uint256 i = 0; i < _countMaturity && _list.listExists(); i++) {
            uint256 head = _list.getHead();
            (uint256 amount, uint256 maturityEnd, , uint256 next) = _list.getNodeValue(head);

            if (next == 0) {
                break;
            }

            if (maturityEnd <= now) {
                uint256 deleteAmount = _deleteMaturity[maturityEnd];
                _deleteMaturity[maturityEnd] = 0;
                _totalActiveValue = _totalActiveValue.sub(amount.sub(deleteAmount));
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
     * @dev Transfer tokens
     * @param sender user address
     * @param recipient user address
     * @param amount number of tokens
     */
    function _transfer(address sender, address recipient, uint256 amount) internal override {
        accrueInterest();
        if (sender != address(0)) {
            _updateBalance(sender);
        }
        if (recipient != address(0)) {
            _updateBalance(recipient);
        }
        super._transfer(sender, recipient, amount);
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
                super._mint(account, delta);
            }
        }
        _holderIndex[account] = _expIndex;
    }
}
