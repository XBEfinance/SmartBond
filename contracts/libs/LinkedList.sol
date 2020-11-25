pragma solidity ^0.6.0;


/**
 * @title LinkedList
 * @dev An utility library for using sorted linked list data structures in your Solidity project.
 */
library LinkedList {
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

    function listExists(List storage self) public view returns (bool) {
        return self.head != 0;
    }

    function getHead(List storage self) public view returns (uint256) {
        return self.head;
    }

    function getEnd(List storage self) public view returns (uint256) {
        return self.end;
    }

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

    function setHead(List storage self, uint256 id) public {
        self.head = id;
    }

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
