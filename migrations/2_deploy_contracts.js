// const WETH9 = artifacts.require('WETH9'); // Wrapper Eth
// const UniswapV2Factory = artifacts.require('UniswapV2Factory'); // Uniswap Factory
// const UniswapV2Router02 = artifacts.require('UniswapV2Router02'); // Uniswap Router

const BFactory = artifacts.require('BFactory'); // Balancer
const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD
const FiatTokenV2 = artifacts.require('FiatTokenV2'); // USDC
const Dai = artifacts.require('Dai'); // DAI

const LinkedList = artifacts.require('LinkedList');
const MockLinkedList = artifacts.require('MockLinkedList');

const EURxb = artifacts.require('EURxb');
const XBG = artifacts.require('XBG');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

const Multisig = artifacts.require('MultiSignature');
const AllowList = artifacts.require('AllowList');
const SecurityAssetToken = artifacts.require('SecurityAssetToken');
const BondTokenMock = artifacts.require('BondTokenMock');
const BondToken = artifacts.require('BondToken');
const TokenAccessRoles = artifacts.require('TokenAccessRoles');
const DDP = artifacts.require('DDP');

// const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
// const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
// const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

const baseURI = 'https://google.com/';

module.exports = function (deployer, network, users) {
  deployer.then(async () => {
    if (network === 'test') {
      // const uniswapFactory = await deployer.deploy(UniswapV2Factory, owner);
      // const weth = await deployer.deploy(WETH9);
      // await deployer.deploy(UniswapV2Router02, uniswapFactory.address, weth.address);

      await deployer.deploy(BFactory);
      await deployer.deploy(TetherToken, web3.utils.toWei('1000000', 'ether'), 'Tether USD', 'USDT', 6);
      await deployer.deploy(BUSDImplementation);
      await deployer.deploy(FiatTokenV2);
      await deployer.deploy(Dai, 1);

      await deployer.deploy(LinkedList);
      await deployer.link(LinkedList, MockLinkedList);
      await deployer.link(LinkedList, EURxb);

      await deployer.deploy(TokenAccessRoles);
      await deployer.link(TokenAccessRoles, BondTokenMock);
      await deployer.link(TokenAccessRoles, BondToken);
      await deployer.link(TokenAccessRoles, SecurityAssetToken);
      await deployer.link(TokenAccessRoles, DDP);
      await deployer.link(TokenAccessRoles, EURxb);
    } else if (network === 'rinkeby' || network === 'rinkeby-fork') {
      await deployer.deploy(LinkedList);
      await deployer.link(LinkedList, EURxb);

      await deployer.deploy(TokenAccessRoles);
      await deployer.link(TokenAccessRoles, BondToken);
      await deployer.link(TokenAccessRoles, SecurityAssetToken);
      await deployer.link(TokenAccessRoles, DDP);
      await deployer.link(TokenAccessRoles, EURxb);

      const multisig = await deployer.deploy(Multisig, ['0x423b44FeE143fC5626948275B4061fec79C20aC7'], 1);
      const allowList = await deployer.deploy(AllowList, multisig.address);
      const bond = await deployer.deploy(BondToken, baseURI);
      const sat = await deployer.deploy(
        SecurityAssetToken, baseURI, multisig.address, bond.address, allowList.address,
      );
      const ddp = await deployer.deploy(DDP, multisig.address);
      const eurxb = await deployer.deploy(EURxb, multisig.address);

      await eurxb.configure(ddp.address);

      await bond.configure(
        allowList.address,
        sat.address,
        ddp.address,
      );

      await multisig.configure(
        allowList.address,
        ddp.address,
        sat.address,
      );

      await ddp.configure(
        bond.address,
        eurxb.address,
        allowList.address,
      );

      await multisig.allowAccount('0x423b44FeE143fC5626948275B4061fec79C20aC7');
    } else {
      console.log('unsupported network', network);
    }
  });
};
