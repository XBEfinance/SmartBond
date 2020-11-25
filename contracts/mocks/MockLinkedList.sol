pragma solidity ^0.6.0;

import "../libs/LinkedList.sol";

contract MockLinkedList {
    using LinkedList for LinkedList.List;

    LinkedList.List private _list;

    function listExists() public view returns (bool) {
        return _list.listExists();
    }

    function getHead() public view returns (uint256) {
        return _list.getHead();
    }

    function getEnd() public view returns (uint256) {
        return _list.getEnd();
    }

    function getNodeValue(uint256 id)
        public
        view
        returns (
            uint256 amount,
            uint256 maturityEnd,
            uint256 prev,
            uint256 next
        )
    {
        (amount, maturityEnd, prev, next) = _list.getNodeValue(id);
    }

    function setHead(uint256 id) public {
        _list.setHead(id);
    }

    function pushBack(uint256 amount, uint256 maturityEnd) public {
        _list.pushBack(amount, maturityEnd);
    }

    function pushBefore(
        uint256 id,
        uint256 amount,
        uint256 maturityEnd
    ) public {
        _list.pushBefore(id, amount, maturityEnd);
    }

    function remove(uint256 id) public {
        _list.remove(id);
    }
}
