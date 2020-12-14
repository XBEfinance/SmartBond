#!/bin/bash
export CONFIG_NAME="./truffle-config.js"
source ./scripts/utils/generate_truffle_config.sh

generate_truffle_config "0.6.3" ".\/contracts"

if [ -n $1 ]; then
    truffle-flattener $1 >> contracts/Flattened.sol
else
    truffle-flattener contracts/ForFlattened.sol >> contracts/Flattened.sol
fi

# remove config file
rm -f $CONFIG_NAME
