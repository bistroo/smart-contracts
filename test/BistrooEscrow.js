// test with ganache-cli instance
const { singletons } = require('@openzeppelin/test-helpers');
const { use } = require('chai');
// https://kalis.me/assert-reverts-solidity-smart-contract-test-truffle/
const truffleAssert = require('truffle-assertions');

const BistrooEscrow = artifacts.require("BistrooEscrow");
const BistrooToken = artifacts.require("BistrooToken");
const ReEntrancy = artifacts.require("ReEntrancy");

function tokensToHex(tokens) {
  const decimals = web3.utils.toBN(18);
  const transferAmount = web3.utils.toBN(parseInt(tokens, 10));
  const transferAmountHex = '0x' + transferAmount.mul(web3.utils.toBN(10).pow(decimals)).toString('hex');
  return transferAmountHex;
}

/// @dev to prevent BigNumber issue
function numAsHex(num) {
  let hexNum = "0x" + num.toString('hex');
  return hexNum;
}

// function toBnHex(num) {
//   let bnHex = web3.utils.numberToHex(new web3.utils.toBN(num)).toString();
//   return bnHex;
// }

const deliveryCost = tokensToHex(20);

contract("BistrooEscrow", accounts => {
  let tokenInstance;
  let escrowInstance;
  let reEntrancyInstance;
  let erc1820;
  let escrowAddress;

  let tokensupply = accounts[0];
  let supplier = accounts[1];
  let client = accounts[2];
  let courier = accounts[3];

  const sendTokens = async (to, amount) => {
    await tokenInstance.transfer(to, amount)
  }

  const initiateTest = async() => {
    tokenInstance = await BistrooToken.deployed();
    escrowInstance = await BistrooEscrow.deployed();
    escrowAddress = escrowInstance.address;
    erc1820 = await singletons.ERC1820Registry(tokensupply);
    reEntrancyInstance = await ReEntrancy.deployed();
    reEntrancyAddress = reEntrancyInstance.address;
  }

  initiateTest();

  let userData;
  let deliveryID=0;

  const defineNewDelivery = (async () => {
    await escrowInstance.defineDelivery(
      1234,
      deliveryCost,
      client,
      courier,
      {from: supplier}
    );
    deliveryID++;
    userData = web3.utils.numberToHex(deliveryID);
  });

  async function sendPayment(amount, fromAddress) {
    await tokenInstance.send(
      escrowAddress,
      amount,
      userData,
      {from: fromAddress}
    )
  }

  const confirmDelivery = (async (deliveryIDHex, fromAddress) => {
    await escrowInstance.confirmDelivery(deliveryIDHex, {from: fromAddress});
  });

  const cancelDelivery = (async (_userData, fromAddress) => {
    await escrowInstance.cancelDelivery(
      _userData,
      {from: fromAddress}
    );
  });
  it("funds accounts",  async () => {
    // transfer tokens to the actors
    let amount = tokensToHex(1000);
    await sendTokens(supplier,amount);
    await sendTokens(client,amount);
    await sendTokens(courier,amount);
    // await reEntrancyAddress.sendTransaction(web3.toWei(10,"ether"), {from: accounts[0]});
    await web3.eth.sendTransaction({to: reEntrancyAddress, from: accounts[1], value: web3.utils.toWei("10", 'ether')});

    // establish initial balances
    let balanceSupplier = await tokenInstance.balanceOf.call(supplier);
    let balanceClient = await tokenInstance.balanceOf.call(client);
    let balanceCourier = await tokenInstance.balanceOf.call(courier);

    // check that tokens were transferred
    assert.equal(
      web3.utils.toHex(balanceSupplier),
      tokensToHex(1000),
      'supplier did not receive tokens ');
    assert.equal(
      web3.utils.toHex(balanceClient),
      tokensToHex(1000),
      'client did not receive tokens ');
    assert.equal(
      web3.utils.toHex(balanceCourier),
      tokensToHex(1000),
      'courier did not receive tokens ');
    })
  
  it("registers a new delivery",  async () => {
    await defineNewDelivery();
    let delivery = await escrowInstance.deliveries(deliveryID);

    assert.equal(
      delivery.status.status,
      "1-registered",
      "status is not correct ('1-registered')"
    );
    
    assert.equal(
      delivery.courier,
      courier,
      "It wasn't the courier (" + courier + ")"
    );
  });

  it("rejects escrow payment not done by supplier",  async () => {
    await truffleAssert.reverts(
      sendPayment(deliveryCost, client),
      "Payment not made by supplier"
    )
  });

  it("rejects an incorrect escrow payment",  async () => {
    let payment = tokensToHex(30);
    await truffleAssert.reverts(
      sendPayment(payment, supplier),
      "Escrow payment is not the same as the delivery cost"
    )
  });

  it("registers escrow payment",  async () => {
    let balanceSupplierBefore = await tokenInstance.balanceOf.call(supplier);
    let balanceContractBefore = await tokenInstance.balanceOf.call(escrowAddress);
    await sendPayment(deliveryCost, supplier);
    let balanceSupplierAfter = await tokenInstance.balanceOf.call(supplier);
    let balanceContractAfter = await tokenInstance.balanceOf.call(escrowAddress);

    let delivery = await escrowInstance.deliveries(deliveryID);

    assert.equal(
      web3.utils.toHex(balanceSupplierBefore - balanceSupplierAfter),
      deliveryCost,
      "wasn't in the client account (" + deliveryCost + ")"
    );

    assert.equal(
      web3.utils.toHex(balanceContractAfter - balanceContractBefore),
      deliveryCost,
      "wasn't in the contract account (" + deliveryCost + ")"
    );

    let escrowPaid = delivery.status.escrowPaid;

    assert.equal(
      escrowPaid,
      true,
      "escrowPaid should have been true"
    )
  });

  it("rejects another escrow payment",  async () => {
    await truffleAssert.reverts(
      sendPayment(deliveryCost, supplier),
      "Escrow is already deposited"
    )
  });

  it("rejects register confirmDelivery by supplier",  async () => {
    await truffleAssert.reverts(
      confirmDelivery(userData, supplier),
      "Only client can confirm delivery"
    )
  });

  it("cancels a delivery",  async () => {
    let balanceCourierBefore = await tokenInstance.balanceOf.call(courier);
    let balanceSupplierBefore = await tokenInstance.balanceOf.call(supplier);
    await cancelDelivery(web3.utils.numberToHex(deliveryID), supplier);
    let balanceCourierAfter = await tokenInstance.balanceOf.call(courier);
    let balanceSupplierAfter = await tokenInstance.balanceOf.call(supplier);
    let delivery = await escrowInstance.deliveries(deliveryID);

    assert.equal(
      delivery.status.escrowPaid,
      false,
      "escrowPaid should have been false"
    )

    assert.equal(
      delivery.status.deliveryConfirmed,
      false,
      "deliveryConfirmed should have been false"
    )

    assert.equal(
      delivery.status.deliveryEnded,
      true,
      "deliveryEnded should have been true"
    )

    // supplier should have received deliveryCost tokens
    assert.equal(
      web3.utils.toHex(balanceSupplierAfter - balanceSupplierBefore),
      deliveryCost,
      "supplier should have received tokens (" + deliveryCost + ")"
    );

    // courier should have received no tokens
    assert.equal(
      web3.utils.toHex(balanceCourierAfter - balanceCourierBefore),
      0,
      "courier should have received no tokens"
    );
  });

  it("tries to settle a delivery that is cancelled",  async () => {
    await truffleAssert.reverts(
      confirmDelivery(web3.utils.numberToHex(deliveryID), client),
      "Delivery already ended."
    )
   });

  // test delivery requirements
  it("rejects a delivery that has no escrow payment",  async () => {
    await defineNewDelivery();
    let delivery = await escrowInstance.deliveries(deliveryID);
    await truffleAssert.reverts(
      confirmDelivery(web3.utils.numberToHex(deliveryID), client),
      "No escrow has been deposited"
    )
  });
  

  // test delivery scenario green
  it("settles a delivery correctly",  async () => {
    // prepare delivery
    await defineNewDelivery();
    await sendPayment(deliveryCost, supplier);
    let balanceCourierBefore = await tokenInstance.balanceOf.call(courier);
    let balanceSupplierBefore = await tokenInstance.balanceOf.call(supplier);

    // settle delivery
    await confirmDelivery(web3.utils.numberToHex(deliveryID), client);
    let balanceCourierAfter = await tokenInstance.balanceOf.call(courier);
    let balanceSupplierAfter = await tokenInstance.balanceOf.call(supplier);
    let delivery = await escrowInstance.deliveries(deliveryID);

    assert.equal(
      delivery.status.escrowPaid,
      true,
      "escrowPaid should have been true"
    )

    assert.equal(
      delivery.status.deliveryEnded,
      true,
      "deliveryEnded should have been true"
    )

    // supplier should not receive tokens
    assert.equal(
      web3.utils.toHex(balanceSupplierAfter - balanceSupplierBefore),
      0,
      "supplier account should not have received tokens"
    );

    // courier should have received deliveryCost tokens
    assert.equal(
      web3.utils.toHex(balanceCourierAfter - balanceCourierBefore),
      deliveryCost,
      "courier account should have received deliveryCost tokens (" + deliveryCost + ")"
    );
  });

  // test reentrancyAttack
  const reentrancyAttack = (async (_userData, fromAddress) => {
    await reEntrancyInstance.attack(
      userData,
      {from: fromAddress}
    );
  });

  it("prevents a re-entrancy attack during confirm delivery",  async () => {

    await escrowInstance.defineDelivery(
      1234,
      deliveryCost,
      reEntrancyAddress,
      supplier,
      {from: supplier}
    );
    deliveryID++;
    userData = web3.utils.numberToHex(deliveryID);
    // prepare delivery
    await sendPayment(deliveryCost, supplier, {gas: 5000000, gasPrice: 500000000});
    let balanceContractBefore = await tokenInstance.balanceOf.call(escrowAddress);

    // settle delivery with re-entrancy attack
    // await reentrancyAttack(web3.utils.numberToHex(deliveryID), supplier);
    await truffleAssert.reverts(
      reentrancyAttack(web3.utils.numberToHex(deliveryID), supplier),
      "Delivery already ended"
    )
    
    // delivery should have been settled
    let balanceContractAfter = await tokenInstance.balanceOf.call(escrowAddress);
    let difference = (balanceContractBefore - balanceContractAfter) / 1000000000000000000;
    let delivery = await escrowInstance.deliveries(deliveryID);
    console.log(`delivery: ${JSON.stringify(delivery)}`);

    assert.equal(
      difference,
      0,
      "delivery should not have been settled"
    );
  });
});

