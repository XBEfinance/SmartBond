#!/bin/bash
export CONFIG_NAME="./truffle-config.js"
source ./scripts/utils/generate_truffle_config.sh

generate_truffle_config "0.6.3" ".\/contracts"

truffle-flattener contracts/ForFlattened.sol >> contracts/Flattened.sol

# remove config file
rm -f $CONFIG_NAME
