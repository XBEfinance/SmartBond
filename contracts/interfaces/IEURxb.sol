pragma solidity >=0.6.0 <0.7.0;


interface IEURxb {
    function mint(address account, uint256 value) external;
    function burn(address account, uint256 value) external;
}
