pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";


/**
 * @title LinkedList
 * @dev An utility library for using sorted linked list data structures in your Solidity project.
 */
library LinkedList {
    using SafeMath for uint256;

    struct Node {
        uint256 amount;
        uint256 maturityEnd;
        uint256 prev; // if 0 then head list
        uint256 next; // if 0 then end list
    }

    struct List {
        uint256 head;
        uint256 end;
        uint256 counter;
        mapping(uint256 => Node) list;
    }

    /**
     * @dev Checks if the list exists
     * @param self stored linked list from contract
     * @return bool true if list exists, false otherwise
     */
    function listExists(List storage self) public view returns (bool) {
        return self.head != 0;
    }

    /**
     * @dev Returns a pointer to the beginning of the list
     * @param self stored linked list from contract
     * @return uint256 id
     */
    function getHead(List storage self) public view returns (uint256) {
        return self.head;
    }

    /**
     * @dev Returns a pointer to the end of the list
     * @param self stored linked list from contract
     * @return uint256 id
     */
    function getEnd(List storage self) public view returns (uint256) {
        return self.end;
    }

    /**
     * @dev Returns the value of the node
     * @param self stored linked list from contract
     * @param id node
     */
    function getNodeValue(List storage self, uint256 id)
        public
        view
        returns (
            uint256 amount,
            uint256 maturityEnd,
            uint256 prev,
            uint256 next
        )
    {
        amount = self.list[id].amount;
        maturityEnd = self.list[id].maturityEnd;
        prev = self.list[id].prev;
        next = self.list[id].next;
    }

    /**
     * @dev Setting the pointer to the beginning of the list
     * @param self stored linked list from contract
     * @param id node
     */
    function setHead(List storage self, uint256 id) public {
        self.head = id;
    }

    /**
     * @dev Update amount the element of the list
     * @param self stored linked list from contract
     * @param id element
     * @param amount tokens
     */
    function updateElementAmount(List storage self, uint256 id, uint256 amount) public {
        self.list[id].amount = self.list[id].amount.add(amount);
    }

    /**
     * @dev Adding to the end of the list
     * @param self stored linked list from contract
     * @param amount number of tokens
     * @param maturityEnd end date of interest accrual
     */
    function pushBack(List storage self, uint256 amount, uint256 maturityEnd) public {
        if (self.end != 0) {
            self.list[self.end].next = self.counter + 1;
        }
        self.list[self.counter + 1] = Node(
            amount,
            maturityEnd,
            self.end,
            0
        );
        self.counter += 1;
        self.end = self.counter;
        self.head = self.head == 0 ? self.counter : self.head;
    }

    /**
     * @dev Adding to the list before a node
     * @param self stored linked list from contract
     * @param id node
     * @param amount number of tokens
     * @param maturityEnd end date of interest accrual
     */
    function pushBefore(
        List storage self,
        uint256 id,
        uint256 amount,
        uint256 maturityEnd
    )
        public
    {
        require(id > 0, "ID must be greater than 0");

        uint256 nodeIDPrev = self.list[id].prev;
        self.list[id].prev = self.counter + 1;

        if (nodeIDPrev > 0) {
            self.list[nodeIDPrev].next = self.counter + 1;
        } else {
            self.head = self.counter + 1;
        }

        self.list[self.counter + 1] = Node(
            amount,
            maturityEnd,
            nodeIDPrev,
            id
        );
        self.counter += 1;
    }

    /**
     * @dev Removing from the list
     * @param self stored linked list from contract
     * @param id node
     */
    function remove(List storage self, uint256 id) public {
        require(id > 0, "ID must be greater than 0");

        uint256 nodeIDPrev = self.list[id].prev;
        uint256 nodeIDNext = self.list[id].next;

        if (nodeIDPrev > 0) {
            self.list[nodeIDPrev].next = nodeIDNext;
        } else {
            self.head = nodeIDNext;
        }

        if (nodeIDNext > 0) {
            self.list[nodeIDNext].prev = nodeIDPrev;
        } else {
            self.end = nodeIDPrev;
        }

        delete self.list[id];
    }
}
