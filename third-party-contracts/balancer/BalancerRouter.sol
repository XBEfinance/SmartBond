pragma solidity 0.5.12;

import "./BFactory.sol";

library SafeMath {
    function add(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }
    function sub(uint a, uint b) internal pure returns (uint) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }
    function sub(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        require(b <= a, errorMessage);
        uint c = a - b;

        return c;
    }
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) {
            return 0;
        }

        uint c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }
    function div(uint a, uint b) internal pure returns (uint) {
        return div(a, b, "SafeMath: division by zero");
    }
    function div(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint c = a / b;

        return c;
    }
}

library Address {
    function isContract(address account) internal view returns (bool) {
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != 0x0 && codehash != accountHash);
    }
}

library SafeERC20 {
    using SafeMath for uint;
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(IERC20 token, address spender, uint value) internal {
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }
    function callOptionalReturn(IERC20 token, bytes memory data) private {
        require(address(token).isContract(), "SafeERC20: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}


contract BalancerRouter {
    BFactory public balancerFactory;

    address[] private bPools;

    constructor (address bFactory) public {
        balancerFactory = BFactory(bFactory);
    }

    function createNewPool(
        address tokenA, uint256 amountA, uint256 weightA,
        address tokenB, uint256 amountB, uint256 weightB,
        uint256 fee) external {
        BPool bPool = balancerFactory.newBPool();
        SafeERC20.safeApprove(IERC20(tokenA), address(bPool), amountA);
        SafeERC20.safeApprove(IERC20(tokenB), address(bPool), amountB);
        bPool.bind(tokenA, amountA, weightA);
        bPool.bind(tokenB, amountB, weightB);
        bPool.setSwapFee(fee);
        bPool.finalize();
        bPools.push(address(bPool));

        uint256 bptBalance = bPool.balanceOf(address(this));
        bPool.transfer(msg.sender, bptBalance);
    }

    function getPool(uint256 index) external view returns (address) {
        if (index >= bPools.length) {
            return address(0);
        }
        return bPools[index];
    }

    function getPoolLength() external view returns (uint256) {
        return bPools.length;
    }
}
