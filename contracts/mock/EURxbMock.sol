pragma solidity >=0.6.0 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../interfaces/IEURxb.sol";


contract EURxbMock is IEURxb, ERC20 {

    event MintInvoked(address account, uint256 value);
    event BurnInvoked(address burn, uint256 value);

    constructor () ERC20("EURxbMock", "EXB") public {}

    function mint(address account, uint256 value) external override {
        emit MintInvoked(account, value);
    }
    function burn(address account, uint256 value) external override {
        emit BurnInvoked(account, value);
    }
}
