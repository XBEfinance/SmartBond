const fse = require('fs-extra');

module.exports = {
  skipFiles: ['Migrations.sol'],
  onCompileComplete: async function(config){
    await fse.copySync(config.working_directory + '/node_modules/@uniswap/v2-core/build/UniswapV2Pair.json', config.contracts_build_directory);
    await fse.copySync(config.working_directory + '/node_modules/@uniswap/v2-core/build/UniswapV2Factory.json', config.contracts_build_directory);
    await fse.copySync(config.working_directory + '/node_modules/@uniswap/v2-periphery/build/WETH9.json', config.contracts_build_directory);
    await fse.copySync(config.working_directory + '/node_modules/@uniswap/v2-periphery/build/TransferHelper.json', config.contracts_build_directory);
    await fse.copySync(config.working_directory + '/node_modules/@uniswap/v2-periphery/build/UniswapV2Router02.json', config.contracts_build_directory);

    await fse.copySync(config.working_directory + '/build/contracts', config.contracts_build_directory);
  }
};

