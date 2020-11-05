pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

abstract contract PoolInterface {
    function joinPool(uint256 poolAmountOut, uint256[] calldata maxAmountsIn)
        external
        virtual;

    function totalSupply() external virtual view returns (uint256);

    function getBalance(address token) external virtual view returns (uint256);
}

contract Router is Ownable {
    using SafeMath for uint256;

    address private _exchanger;
    address private _balancer;
    address private _tEURxb;

    constructor(
        address exchanger,
        address balancer,
        address tEURxb
    ) public {
        _exchanger = exchanger;
        _balancer = balancer;
        _tEURxb = tEURxb;
    }

    function addLiquidity(address from, uint256 amount) public returns (bool) {
        uint256 allowance = IERC20(from).allowance(msg.sender, address(this));
        require(allowance >= amount, "No coins available");

        IERC20(from).transferFrom(msg.sender, address(this), amount);

        uint256 exchangeTokens = amount.div(2);
        uint256 amountEUR = exchangeTokens.mul(23).div(27);

        IERC20(from).approve(_exchanger, exchangeTokens);
        (bool success, bytes memory _data) = _exchanger.call(
            abi.encodeWithSignature(
                "exchange(address,uint256)",
                from,
                exchangeTokens
            )
        );
        require(success, "Exchange failed");

        uint256 balanceEUR = IERC20(_tEURxb).balanceOf(address(this));
        require(balanceEUR >= amountEUR, "Not enough tokens");

        IERC20(from).approve(_balancer, exchangeTokens);
        IERC20(_tEURxb).approve(_balancer, amountEUR);

        PoolInterface balancer = PoolInterface(_balancer);
        uint256 totalSupply = balancer.totalSupply();
        uint256 balance = balancer.getBalance(_tEURxb);
        uint256 ratio = amountEUR.div(balance);
        uint256 amountBPT = totalSupply.mul(ratio);

        // TODO calculate exchangeTokens

        uint256[] memory data = new uint256[](2);
        data[0] = exchangeTokens;
        data[1] = amountEUR;
        balancer.joinPool(amountBPT, data);

        return true;
    }
}
