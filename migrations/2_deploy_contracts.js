const Router = artifacts.require('./Router');
const StakingManager = artifacts.require('./StakingManager');
const BFactory = artifacts.require('./BFactory');

const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

const teamAddress = "0x0000000000000000000000000000000000000000";
const BPool = "0x0000000000000000000000000000000000000000";
const EURxb = "0x0000000000000000000000000000000000000000";
const gEuro = "0x0000000000000000000000000000000000000000";

module.exports = function (deployer) {
  deployer.then(async () => {
    await deployer.deploy(BFactory);
    await deployer.deploy(StakingManager, BPool, gEuro, 1604993292, 60); // TODO: set real values
    await deployer.deploy(Router, teamAddress, BPool, StakingManager.address, USDT, USDC, BUSD, DAI, EURxb);
  });
};
