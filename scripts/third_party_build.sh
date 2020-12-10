#!/bin/bash

source ./scripts/utils/generate_truffle_config.sh

# build balancer
generate_truffle_config "0.5.12" ".\/third-party-contracts\/balancer" "true" 1
truffle compile

# build USDT
generate_truffle_config "0.4.17" ".\/third-party-contracts\/USDT"
truffle compile

# build BUSD
generate_truffle_config "0.4.24" ".\/third-party-contracts\/BUSD"
truffle compile

# build USDC
generate_truffle_config "0.6.12" ".\/third-party-contracts\/USDC" "true" 1
truffle compile

# build Dai
generate_truffle_config "0.5.12" ".\/third-party-contracts\/DAI"
truffle compile
