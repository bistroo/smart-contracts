const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const infuraKey = fs.readFileSync(".infura").toString().trim(); // infura key
const mnemonic = fs.readFileSync(".secret")
  .toString().trim();
  console.log("mnemonic = %s", mnemonic);
// test account: 0x34857b30BF83aEC42A61EFB92AA4fcFAD8723Ff8 (0xca8c40b92755724c69d2b480ee0bb56b61744a3f76fb1000ee03b4271b5bc6b0)
const etherscan = fs.readFileSync(".etherscan").toString().trim(); // infura key
 
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*"        // Any network (default: none)
    },
    rinkeby: {
    provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`),         //provider:   Nonce,
    network_id: 4,       // rinkeby id
    gas: 5500000,
    skipDryRun: true
    },
    'rinkeby-update': {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${infuraKey}`),         //provider:   Nonce,
      network_id: 4,       // rinkeby id
      gas: 5500000,
      skipDryRun: true
    }
  },
  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.7",    // Fetch exact version from solc-bin (default: truffle's version)
      docker: false,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: false,
          runs: 200
        },
        evmVersion: "constantinople"
      }
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],  
  api_keys: {
    etherscan: etherscan
  }
}
 
 