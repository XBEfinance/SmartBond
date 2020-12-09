const uniswapV2Pair_bytecode = require('../build/contracts/UniswapV2Pair.json');
const _solidity = require('@ethersproject/solidity');

const COMPUTED_INIT_CODE_HASH = (0, _solidity.keccak256)(['bytes'], [uniswapV2Pair_bytecode.bytecode]);
console.log(COMPUTED_INIT_CODE_HASH);
