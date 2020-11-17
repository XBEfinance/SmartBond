pragma solidity >= 0.6.0 < 0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";


contract AllowList is Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    mapping(address => bool) private _allowList;

    uint256 private _count;
    Counters.Counter private _counter;

    constructor(address owner) public {
        transferOwnership(owner);
    }

    /**
     * Allows user to receive tokens
     */
    function allowAccount(address account) external onlyOwner {
        if (!_isAllowedAccount(account)) {
            _allowList[account] = true;
            _counter.increment();
        }
    }

    /**
     * Forbids user from receiving tokens
     */
    function disallowAccount(address account) external onlyOwner {
        if (_isAllowedAccount(account)) {
            delete _allowList[account];
            _counter.decrement();
        }
    }

    /**
     * Checks if user is allowed to receive tokens
     */
    function isAllowedAccount(address account) external view returns(bool) {
        return _isAllowedAccount(account);
    }

    /**
     * Returns total count of allowed accounts
     */
    function allowListCount() view public returns(uint256) {
        return _counter.current();
    }

    function _isAllowedAccount(address account) private view returns(bool) {
        return _allowList[account];
    }
}
