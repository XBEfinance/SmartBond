pragma solidity ^0.6.0;

import "../libs/LinkedList.sol";

contract MockLinkedList {
    using LinkedList for LinkedList.List;

    LinkedList.List private _list;

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
        amount = _list.list[id].amount;
        maturityEnd = _list.list[id].maturityEnd;
        prev = _list.list[id].prev;
        next = _list.list[id].next;
    }

    function listExists() public view returns (bool) {
        return _list.listExists();
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
