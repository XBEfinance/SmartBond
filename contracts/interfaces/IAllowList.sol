pragma solidity >=0.6.0 <0.7.0;

interface IAllowList {
    function isAllowedAccount(address account) external view returns (bool);
}
