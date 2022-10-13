# Bistroo Settlement Contract
The first steps towards a decentralised Bistroo supply chain are set.
We created a first version of a escrow settlement contract for the decentralisation of the proces

Today we’re releasing the open sourced and tested version of this solidity contract
It is relying on a BIST ERC777 token (with its special hooks) to facilitate the proces

We have visualised the proces in the schematics below
Also the demo run is visible in the terminal screenshot



## Process flow
```
Bistroo ERC777 Token and Escrow contract for conditional last mile delivery payment.
```

### Confirm delivery
![Confirm delivery flow](https://github.com/bistroo/smart-contracts/blob/main/images/escrow-confirm.png)
### Cancel delivery
![Cancel delivery flow](https://github.com/bistroo/smart-contracts/blob/main/images/escrow-cancel.png)

# Installation

## Installing the test enviroment
* run `npm install` to install web3, openzeppelin and truffle libraries

In order to use the truffle-config.js file:
* create .infura file containing infura project ID for using Infura Web3 api
* create .secret file containing mnemonics for creating a specific token owner account
* create .etherscan file etherscan key

# Test and deployment

## On local ganache
open a terminal window
run ganache cli with custom config in this terminal window
```
./start-ganache.sh
```
### Test smart contracts
run ganache cli
open a terminal window
Run test script:
```
truffle test ./test/BistrooToken.js
truffle test ./test/BistrooEscrow.js
```
Known issue with older Truffle version and Babel: `npm install -g babel-runtime`

![Terminal screenshot](https://github.com/bistroo/smart-contracts/blob/main/images/terminal-dump.png)


### Deploy smart contracts
```
npm run migrate-ganache
```
## On Rinkeby
Deploy only the escrow contract on Rinkeby:
```
npm run migrate-rinkeby-update
```
Deploy both contracts on Rinkeby:
```
npm run migrate-rinkeby
```

