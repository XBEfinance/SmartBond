#!/bin/bash

export CONFIG_NAME="./truffle-config.js"
source ./scripts/utils/generate_truffle_config.sh

if [ -n $1 ]; then
  if [[ $1 = "+fast" ]]; then
    echo "Run tests without build!"
    generate_truffle_config "0.6.3" ".\/contracts"

    #remove +fast parameter
    shift
  else
    # remove previous build
    rm -rf ./build

    # build third party contracts
    ./scripts/third_party_build.sh

    # build our contracts
    generate_truffle_config "0.6.3" ".\/contracts"
    truffle compile

    cp ./node_modules/@uniswap/v2-core/build/UniswapV2Pair.json ./build/contracts
    cp ./node_modules/@uniswap/v2-core/build/UniswapV2Factory.json ./build/contracts
    cp ./node_modules/@uniswap/v2-periphery/build/WETH9.json ./build/contracts
    cp ./node_modules/@uniswap/v2-periphery/build/TransferHelper.json ./build/contracts
    cp ./node_modules/@uniswap/v2-periphery/build/UniswapV2Router02.json ./build/contracts
  fi
fi

# run tests
truffle test $@

# remove config file
rm -f $CONFIG_NAME
