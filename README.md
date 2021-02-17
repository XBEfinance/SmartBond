# EURxb.finance

app.eurxb.finance

contact@eurxb.finance

[Twitter](https://twitter.com/EURxbfinance)

The EURxb is an ERC20 Euro Stable coin that earns real time interest of 7% per annum for the duration of the protocol’s bond reserves’ term. The EURxb is collateralised by ISIN registered securities (green bonds) as ERC721 NFTs which is further overcollateralized (at a rate of 133%) by tokenized ERC721 NFT security assets.

## **Contracts Overview**

[Allow List](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/AllowList.sol)

[EURxb BondToken (EBND)](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/BondToken.sol)

[DDP - Delegated Depenture Position](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/DDP.sol)

[EURxb](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/EURxb.sol)

[MultiSignature](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/MultiSignature.sol)

[OperatorVote](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/OperatorVote.sol)

[EURxb Router - Atomic swap module](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/Router.sol)

[EURxb SecurityAssetToken (ESAT)](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/SecurityAssetToken.sol)

[StakingManager](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/StakingManager.sol)

[EURxb Governance token - XBE](https://github.com/EURxbfinance/SmartBond/blob/master/contracts/XBE.sol)



EURxb SmartBond Contracts
=================
**The system of Smart-Contracts for bonds digitization** 

## Overview

### Requirements

- nodeJS v10.15.0 or later
- npm 6.4.1 or later
- Truffle v5.1.48 (core: 5.1.48) or later

### Installation
- `npm i` - install all dependencies

### Build contracts
- `npm run build` - build all contracts

### Run tests
- `npm run test` - start all tests
- `npm run test +fast` - start tests without rebuild contracts
- `npm run test test/<filename>.js` - run tests for only one file
- `npm run test +fast test/<filename>.js` - run tests for only one file without rebuild contracts

### Run coverage
- `npm run coverage` - to check the percentage of code covered by tests

### Make Flattened contract file
- `npm run flatten` - make Flattened.sol file with all contracts
- `npm run flatten contracts/<filename>.sol` - make Flattened.sol file for same contract

### Deploy contracts

- create `.secret` file in the project directory and push there seed phrase belonging to your Ethereum account
- create `.env` file with next variables:
 ```
  INFURA_ID=<your_infura_project_id>
  ETHERSCAN_API_KEY=<your_etherscan_api_key>
  DEPLOYER_ACCOUNT=<your_ethereum_account>
  TEAM_ACCOUNT=<team_ethereum_account>
  START_TIME=<unix_timestamp>
 ```
  
- `npm run deploy` - deploy and configure all contracts in rinkeby testnet
- `npm run deploy <network>` - deploy and configure all contracts for some network [NOT IMPLEMENTED]

### Verify deployed contracts

- `npm run verify` - verify all contracts in rinkeby testnet
- `npm run verify <contract>` - verify only one contract in rinkeby testnet
- `npm run verify all <network>` - verify all contracts in network
- `npm run verify <contract> <network>` - verify only one contract in network

