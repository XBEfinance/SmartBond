const BFactory = artifacts.require('./BFactory');

const LinkedList = artifacts.require('./LinkedList');
const MockLinkedList = artifacts.require('./MockLinkedList');

const EURxb = artifacts.require('./EURxb');
const XBG = artifacts.require('./XBG');

const Router = artifacts.require('./Router');
const StakingManager = artifacts.require('./StakingManager');

const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

const teamAddress = "0x0000000000000000000000000000000000000000";

module.exports = function (deployer) {
  deployer.then(async () => {
    await deployer.deploy(BFactory);

    await deployer.deploy(LinkedList);
    await deployer.link(LinkedList, MockLinkedList);
    await deployer.link(LinkedList, EURxb);

    await deployer.deploy(EURxb);
    await deployer.deploy(XBG, 1); // TODO: set real values

    await deployer.deploy(StakingManager, XBG.address, 1604993292, 150); // TODO: set real values
    await deployer.deploy(Router, teamAddress, StakingManager.address, 1604993292, USDT, USDC, BUSD, DAI, EURxb.address);
  });
};
