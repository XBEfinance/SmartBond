#!/bin/bash

build_contracts() {
  SOLC_VERSION=$1
  CONTRACT_DIR=$2
  CONFIG_NAME="./truffle-config.js"
  rm -f $CONFIG_NAME
  touch $CONFIG_NAME
  cat "./truffle-config-template.js" >> $CONFIG_NAME
  sed -i -e "s/solcVersion/$SOLC_VERSION/g" $CONFIG_NAME
  sed -i -e "s/contractsDirectory/$CONTRACT_DIR/g" $CONFIG_NAME
  # build contract
  npm run truffle-build
  # remove temp file
  rm -f $CONFIG_NAME
}

#remove previous build
rm -rf ./build

# build balancer
build_contracts "0.5.12" ".\/third-party-contracts\/balancer"

# build our contracts
build_contracts "0.6.3" ".\/contracts"

