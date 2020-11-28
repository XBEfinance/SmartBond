#!/bin/bash

export CONFIG_NAME="./truffle-config.js"
source ./scripts/utils/generate_truffle_config.sh

if [ -n $1 ]; then
  if [[ $1 = "+fast" ]]; then
    echo "Run tests without build!"
    generate_truffle_config "0.6.3" ".\/contracts" "false" 200

    #remove +fast parameter
    shift
  else
    # remove previous build
    rm -rf ./build

    # build third party contracts
    ./scripts/third_party_build.sh

    # build our contracts
    generate_truffle_config "0.6.3" ".\/contracts" "false" 200
    truffle compile
  fi
fi

# run tests
truffle test $@

# remove config file
rm -f $CONFIG_NAME