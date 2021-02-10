pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";


/**
 * @title eurxb.finance governments token
 * @dev xbe token
 */
contract XBE is ERC20 {
    using Address for address;
    using SafeMath for uint256;

    address public governance;
    mapping (address => bool) public minters;

    constructor(
        uint256 initialSupply
    ) public ERC20("XBE", "XBE") {
        governance = _msgSender();
        _mint(msg.sender, initialSupply);
    }

    function mint(address account, uint256 amount) external {
        require(minters[msg.sender], "!minter");
        _mint(account, amount);
    }

    function setGovernance(address _governance) external {
        require(msg.sender == governance, "!governance");
        governance = _governance;
    }

    function addMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = true;
    }

    function removeMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = false;
    }
}
