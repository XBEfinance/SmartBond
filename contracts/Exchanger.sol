pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Exchanger {
    using SafeMath for uint256;

    address private _tUSDT;
    address private _tUSDC;
    address private _tBUSD;
    address private _tDAI;
    address private _tEURxb;

    constructor(
        address tUSDT,
        address tUSDC,
        address tBUSD,
        address tDAI,
        address tEURxb
    ) public {
        _tUSDT = tUSDT;
        _tUSDC = tUSDC;
        _tBUSD = tBUSD;
        _tDAI = tDAI;
        _tEURxb = tEURxb;
    }

    function exchange(address from, uint256 amount) public returns (bool) {
        require(
            from == _tUSDT || from == _tUSDC || from == _tBUSD || from == _tDAI,
            "Token not found"
        );

        uint256 allowance = IERC20(from).allowance(msg.sender, address(this));
        require(allowance >= amount, "No coins available");

        uint256 eur = amount.mul(23).div(27);

        IERC20(from).transferFrom(msg.sender, address(this), amount);
        IERC20(_tEURxb).transfer(msg.sender, eur);
        return true;
    }
}
