#!/bin/bash

SOLC_VERSION="0.6.3"
CONTRACT_DIR=".\/contracts"
CONFIG_NAME="./truffle-config.js"

# remove previous config file
rm -f $CONFIG_NAME

#create new config file
touch $CONFIG_NAME
cat "./truffle-config-template.js" >> $CONFIG_NAME
sed -i -e "s/solcVersion/$SOLC_VERSION/g" $CONFIG_NAME
sed -i -e "s/contractsDirectory/$CONTRACT_DIR/g" $CONFIG_NAME

#run coverage
truffle run coverage

# remove config file
rm -f $CONFIG_NAME