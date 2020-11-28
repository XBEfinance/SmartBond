#!/bin/bash

source ./scripts/utils/generate_truffle_config.sh

# build balancer
generate_truffle_config "0.5.12" ".\/third-party-contracts\/balancer" "true" 1
npm run truffle-build