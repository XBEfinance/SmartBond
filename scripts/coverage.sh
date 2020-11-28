#!/bin/bash

export CONFIG_NAME="./truffle-config.js"
source ./scripts/utils/generate_truffle_config.sh

# remove previous build
rm -rf ./build

# build third party contracts
./scripts/third_party_build.sh

generate_truffle_config "0.6.3" ".\/contracts" "false" 200

#run coverage
truffle run coverage

# remove build
rm -rf ./build

# remove config file
rm -f $CONFIG_NAME