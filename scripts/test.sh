#!/bin/bash

export CONFIG_NAME="./truffle-config.js"
source ./scripts/utils/generate_truffle_config.sh

FAST_FLAG=false
if [ -n $1 ]; then
  if [[ $1 = "+fast" ]]; then
    FAST_FLAG=true
    shift
  fi
fi

if [ $FAST_FLAG = false ]
then
  echo $FAST_FLAG
  # remove previous build
  rm -rf ./build

  # build third party contracts
  ./scripts/third_party_build.sh

  # build our contracts
  generate_truffle_config "0.6.3" ".\/contracts" "false" 200
  npm run truffle-build
else
  echo "Run tests without build!"
  generate_truffle_config "0.6.3" ".\/contracts" "false" 200
fi

# run tests
npm run truffle-test $@

# remove config file
rm -f $CONFIG_NAME