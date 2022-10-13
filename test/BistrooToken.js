// Based on https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/examples/SimpleToken.test.js
// And https://forum.openzeppelin.com/t/simple-erc777-token-example/746
const { expectEvent, singletons, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

function tokensToHex(tokens) {
  const decimals = web3.utils.toBN(18);
  const transferAmount = web3.utils.toBN(parseInt(tokens, 10));
  const transferAmountHex = web3.utils.toHex(transferAmount.mul(web3.utils.toBN(10).pow(decimals))); // .toString('hex');
  return transferAmountHex;
}
const amount = tokensToHex(100);

const BistrooToken = artifacts.require("BistrooToken.sol");
let btInstance;

const transferTokens = async (to, amount) => {
  return btInstance.transfer(to, amount)
}

const sendTokens = async (tokens, fromAddress, toAddress, userData) => {
  await btInstance.send(
    toAddress,
    tokens,
    userData,
    {from: fromAddress}
  )
}

contract('BistrooToken', accounts => {
  let tokensupply = accounts[0];
  let sender = accounts[1];
  let receiver = accounts[2];
  let balanceSenderBefore;
  let balanceReceiverBefore;
  
  const initiateTest = async() => {
    btInstance = await BistrooToken.deployed();
    erc1820 = await singletons.ERC1820Registry(tokensupply);
  }
  
  initiateTest();
  
  it('sender received tokens', async () => {
    // transfer tokens to the actors
    let amount = tokensToHex(1000);
    await transferTokens(sender,amount);

    // establish initial balances
    balanceSenderBefore = await btInstance.balanceOf.call(sender);
    balanceReceiverBefore = await btInstance.balanceOf.call(receiver);
    
    // check that tokens were transferred
    assert.equal(
      web3.utils.toHex(balanceSenderBefore),
      tokensToHex(1000),
      'sender did not receive tokens ');
  });

  it('has a name', async () => {
    let BistrooTokenContract = await BistrooToken.deployed();
    const tokenName = await BistrooTokenContract.name();
    assert.equal(tokenName, 'Bistroo Token', "Token name is not correct");
  });

  it('has send 100 tokens', async () => {
    await sendTokens(amount, sender, receiver, "0x");
    balanceSenderAfter = await btInstance.balanceOf.call(sender);
    balanceReceiverAfter = await btInstance.balanceOf.call(receiver);

    assert.equal(
      web3.utils.toHex(balanceSenderBefore - balanceSenderAfter),
      amount,
      `${amount} tokens not send`
    );
    
    assert.equal(
      web3.utils.toHex(balanceReceiverAfter - balanceReceiverBefore),
      amount,
      `${amount} tokens not received`
    );

  });
});