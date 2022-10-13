const BistrooToken = artifacts.require("../contracts/BistrooToken.sol");
const BistrooEscrow = artifacts.require("../contracs/BistrooEscrow.sol");
const ReEntrancy = artifacts.require("../contracs/ReEntrancy.sol");

require('@openzeppelin/test-helpers/configure')({ provider: web3.currentProvider, environment: 'truffle' });

const { singletons } = require('@openzeppelin/test-helpers');

// ** DEPLOY ALL CONTRACTS TO GANACHE OR ONLY DEPLOY TRANSPORT AND ORDER CONTRACT TO RINKEBY **
module.exports = async function(deployer, network, accounts) {
  let tokenAddress;
  try {
    if(network === 'development') {
       await singletons.ERC1820Registry(accounts[0]);
    }
    if (network === 'rinkeby-update') {
      console.log('doing rinkeby update deploy')
      tokenAddress = "0xe0D15a857B78E4472876476Bef9DA392EC5Bce23";
    } else {
      console.log('doing other deploy')
      await deployer.deploy(BistrooToken);
      let tokenInstance = await BistrooToken.deployed();
      tokenAddress = tokenInstance.address;
      console.log("deployed BistrooToken contract to %s", tokenAddress)
    }

    await deployer.deploy(BistrooEscrow, tokenAddress);
    let contractInstance = await BistrooEscrow.deployed();
    escrowAddress = contractInstance.address;
    console.log("deployed BistrooEscrow contract to %s", contractInstance.address);

    await deployer.deploy(ReEntrancy, escrowAddress);
    let ReEntrancyInstance = await ReEntrancy.deployed();
    console.log("deployed ReEntrancy contract to %s", ReEntrancyInstance.address);

  } catch (error) {
    console.log(error);
  }
  
};
