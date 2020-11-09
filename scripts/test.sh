#!/bin/bash

CONFIG_NAME="./truffle-config.js"

build_for_test_contracts() {
  SOLC_VERSION=$1
  CONTRACT_DIR=$2
  OPTIMIZATION_KEY=$3
  RUN_KEY=$4
  # remove previous config file
  rm -f $CONFIG_NAME
  touch $CONFIG_NAME
  cat "./truffle-config-template.js" >> $CONFIG_NAME
  sed -i -e "s/solcVersion/$SOLC_VERSION/g" $CONFIG_NAME
  sed -i -e "s/contractsDirectory/$CONTRACT_DIR/g" $CONFIG_NAME
  sed -i -e "s/enabled: false/enabled: $OPTIMIZATION_KEY/g" $CONFIG_NAME
  sed -i -e "s/runs: 200/runs: $RUN_KEY/g" $CONFIG_NAME
  # build contract
  npm run truffle-build
}

#remove previous build
rm -rf ./build

# build balancer
build_for_test_contracts "0.5.12" ".\/third-party-contracts\/balancer" "true" 1

# build our contracts
build_for_test_contracts "0.6.3" ".\/contracts" "false" 200

npm run truffle-test

# remove config file
rm -f $CONFIG_NAME