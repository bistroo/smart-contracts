pragma experimental ABIEncoderV2; // supports structs and arbitrarily nested arrays
pragma solidity>0.4.99<0.6.0;

import "@openzeppelin/contracts/token/ERC777/IERC777.sol";   // to send and receive ERC777 tokens
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";   // to receive ERC777 tokens
import "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";   // to send ERC777 tokens
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/introspection/ERC1820Implementer.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/// @dev BistrooEscrow takes Bistroo token in escrow from supplier for payment of delivery of order by courier.
/// @dev Client releases escrow by signing for delivery, supplier reclain the escrow by cancelling the delivery.
contract BistrooEscrow is IERC777Recipient, IERC777Sender, ERC1820Implementer {

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");
    bytes32 constant public TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    IERC777 public bistrooToken;

    /// @dev Link contract to token.
    /// @dev For a smart contract to receive ERC777 tokens, it needs to implement the tokensReceived hook and register with ERC1820 registry as an ERC777TokensRecipient
    constructor (IERC777 tokenAddress) public {
        bistrooToken = IERC777(tokenAddress);
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    // using SafeMath for uint256;
    // bytesToUint en uinToByes also with SafeMath

    function bytesToUint(bytes memory userData) public pure returns (uint256 number) {
        number=0;
        for(uint i=0;i<userData.length;i++){
            number *= 256;
            number += uint(uint8(userData[i]));
        }
    }

    function uintToBytes(uint256 x) public pure returns (bytes memory b) {
        b = new bytes(32);
        for (uint i = 0; i < 32; i++) {
            b[i] = byte(uint8(x / (2**(8*(31 - i)))));
        }
    }

    function senderFor(address account) public {
        _registerInterfaceForAddress(TOKENS_SENDER_INTERFACE_HASH, account);
    }

    event DoneStuff(address operator, address from, address to, uint256 cost, bytes userData, bytes operatorData);
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 cost,
        bytes memory userData,
        bytes memory operatorData
    ) public {
        emit DoneStuff(operator, from, to, cost, userData, operatorData);
    }

    /// @dev  Define contract parameters.
    /// @param deliveryID Contract nonce to prevent replay attack (make sure escrow can only be claimed successfully once).
    uint256 deliveryID = 0;

	/// @dev  Define order status parameters.
	/// @param escrowPaid Set to true when suplier has paid escrow. By default initialized to `false`.
	/// @param deliveryConfirmed Timestamp of registry of delivery delivery.
	/// @param deliveryEnded Set to true after delivery is settled or cancelled, disallows any change. By default initialized to `false`.
	/// @param status Sets status of the order. Possible values: `1-registered, 2-escrowPaid, 3-deliveryConfirmed, 4-deliveryConfirmed, 5-deliveryCancelled.
    struct DeliveryStatus {
        bool escrowPaid;
        bool deliveryConfirmed;
        bool deliveryEnded;
        string status;
    }
	/// @param DeliveryData Array of dynamic size to capture the contract data for a specific order.
    /// @param orderID Order ID of the order to be delivered.
	/// @param deliveryCost Escrow amount.
	/// @param supplier Sets the delivery data, deposits the deliveryCost.
    /// @param client Confirms the delivery.
    /// @param courier Receives the deliveryCost.
    struct DeliveryData {
        uint256 orderID;
        uint256 deliveryCost;
        address supplier;
        address client;
        address courier;
        DeliveryStatus status;
    }

    mapping (uint256 => DeliveryData) public deliveries;
    uint256[] public deliveryIDs;

    event deliveryStatus(uint256 deliveryID, string status);

    /// @notice Register deliveryID parameters and store in struct
    /// @return	deliveryID that is increased by 1 for every new deliveryID registered
    function defineDelivery(
        uint256 _orderID,
        uint256 _deliveryCost,
        address _client_address,
        address _courier_address
    ) public returns(uint256) {
        deliveryID++;
        /// @dev set deliveryID parameters
        deliveries[deliveryID].supplier = msg.sender;
        deliveries[deliveryID].orderID = _orderID;
        deliveries[deliveryID].deliveryCost = _deliveryCost;
        deliveries[deliveryID].client = _client_address;
        deliveries[deliveryID].courier = _courier_address;
        deliveries[deliveryID].status.status = "1-registered";
        
        /// @dev push the new deliveryID to the array of uints deliveryIDs
        deliveryIDs.push(deliveryID);
        emit deliveryStatus(deliveryID, deliveries[deliveryID].status.status);
    }

    function getdeliveryIDs() view public returns(uint256[] memory){
        return deliveryIDs;
    }

    /// @dev Code from https://forum.openzeppelin.com/t/simple-erc777-token-example/746
    event receivedTokens(string text, address operator, address from, address to, uint256 cost, bytes userData, bytes operatorData);
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 escrow,
        bytes calldata userData,   // asume only uint
        bytes calldata operatorData
    ) external {
        uint256 _deliveryID = bytesToUint(userData);
        uint256 _deliveryCost = deliveries[_deliveryID].deliveryCost;
        // check conditions
        require(msg.sender == address(bistrooToken), "Simple777Recipient: Invalid ERC777 token");
        require(from == deliveries[_deliveryID].supplier, "Payment not made by supplier");
        require(escrow == _deliveryCost, "Escrow payment is not the same as the delivery cost");
        require(deliveries[_deliveryID].status.escrowPaid == false, "Escrow is already deposited");
        require(deliveries[_deliveryID].status.deliveryEnded == false, "Delivery is already ended");

        emit receivedTokens("tokensReceived", operator, from, to, escrow, userData, operatorData);

        // register payment
        deliveries[_deliveryID].status.escrowPaid = true;
        deliveries[_deliveryID].status.status = "2-escrowPaid";
        emit deliveryStatus(deliveryID, deliveries[deliveryID].status.status);
    }
    
    function confirmDelivery(bytes memory userData) public {
        uint256 _deliveryID = bytesToUint(userData);
        // check conditions
        require(msg.sender == deliveries[_deliveryID].client, "Only client can confirm delivery");
        require(deliveries[_deliveryID].status.deliveryEnded == false, "Delivery already ended");
        require(deliveries[_deliveryID].status.escrowPaid == true, "No escrow has been deposited");
        // register confirmation
        deliveries[_deliveryID].status.status = "3-deliveryConfirmed";
        emit deliveryStatus(deliveryID, deliveries[deliveryID].status.status);

        bistrooToken.send(deliveries[_deliveryID].courier, deliveries[_deliveryID].deliveryCost, userData);
        deliveries[_deliveryID].status.status = "4-deliveryPaid";
        deliveries[_deliveryID].status.deliveryEnded = true;
        emit deliveryStatus(deliveryID, deliveries[deliveryID].status.status);
     }

    function cancelDelivery(bytes memory userData) public {
        uint256 _deliveryID = bytesToUint(userData);
        // check conditions
        require(msg.sender == deliveries[_deliveryID].supplier, "Only supplier can call this function.");
        require(deliveries[_deliveryID].status.deliveryEnded == false, "Delivery already ended.");
        require(deliveries[_deliveryID].status.escrowPaid == true, "No escrow has been deposited.");
       
        bistrooToken.send(deliveries[_deliveryID].supplier, deliveries[_deliveryID].deliveryCost, userData);
        deliveries[_deliveryID].status.escrowPaid = false;
        deliveries[_deliveryID].status.deliveryEnded = true;
        emit deliveryStatus(deliveryID, deliveries[deliveryID].status.status);
     }

    /// @dev Add later: Kill function, only by owner, should return all remaining tokens and Eth to owner
    /*
    function kill () public {
        selfdestruct(msg.sender);
    }
    */

}