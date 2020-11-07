pragma solidity >= 0.6.0 < 0.7.0;


library StringUtil {
    function toString(address account) public pure returns(string memory) {
        return toString(abi.encodePacked(account));
    }

    function toString(bytes32 value) public pure returns(string memory) {
        return toString(abi.encodePacked(value));
    }

    /**
     * @dev temporary solution for address formatting
    */
    function toString(bytes memory data) public pure returns(string memory) {
        // TODO: simplify
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    function append(string memory a, string memory b) internal pure returns(string memory) {
        return string(abi.encodePacked(a, b));
    }
}
