const { ether, time, BN, constants } = require('@openzeppelin/test-helpers');

// const WETH9 = artifacts.require('WETH9'); // Wrapper Eth
const UniswapV2Factory = artifacts.require('UniswapV2Factory'); // Uniswap Factory
const UniswapV2Pair = artifacts.require('UniswapV2Pair'); // Uniswap Pair
const UniswapV2Router02 = artifacts.require('UniswapV2Router02'); // Uniswap Router

const BFactory = artifacts.require('BFactory'); // Balancer
const BPool = artifacts.require('BPool'); // Balancer
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

module.exports = function (deployer, network) {
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
      await deployer.deploy(LinkedList, { overwrite: false });
      await deployer.link(LinkedList, EURxb);

      await deployer.deploy(TokenAccessRoles, { overwrite: false });
      await deployer.link(TokenAccessRoles, BondToken);
      await deployer.link(TokenAccessRoles, SecurityAssetToken);
      await deployer.link(TokenAccessRoles, DDP);
      await deployer.link(TokenAccessRoles, EURxb);

      const multisig = await deployer.deploy(
        Multisig, [process.env.DEPLOYER_ACCOUNT], 1,
      );
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

      await multisig.allowAccount(process.env.DEPLOYER_ACCOUNT);

      // create 2 tokens
      await multisig.mintSecurityAssetToken(process.env.TEAM_ACCOUNT, ether('200000'),
        (new BN(process.env.START_TIME)).add(time.duration.years('1')));
      await multisig.mintSecurityAssetToken(process.env.TEAM_ACCOUNT, ether('200000'),
        (new BN(process.env.START_TIME)).add(time.duration.years('1')));

      // get stable coins contracts
      const usdt = await TetherToken.at('0x48F2306f7d75DE8d9f2a93AC2b71661A000d4545');
      const usdc = await FiatTokenV2.at('0x58b8e032e52B164fe34D88dF5117F3e5752FE295');
      const busd = await BUSDImplementation.at('0x608b06E6B1b8E2aa6970BD3b1f8c084E44130eB3');
      const dai = await Dai.at('0x569AafF8F90A5E48B27C154249eE5A08eD0C44E2');

      // deploy Router and StakingManager contracts
      const xbg = await deployer.deploy(XBG, ether('15000'));
      const sm = await deployer.deploy(
        StakingManager, xbg.address, process.env.START_TIME,
      );
      const router = await deployer.deploy(
        Router, process.env.TEAM_ACCOUNT, sm.address, process.env.TEAM_ACCOUNT,
        usdt.address, usdc.address, busd.address, dai.address, eurxb.address,
      );

      // configure uniswap pools
      const uniswapRouter = await UniswapV2Router02.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
      const uniswapFactory = await UniswapV2Factory.at('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');

      let usdtPoolAddress = await uniswapFactory.getPair.call(eurxb.address, usdt.address);
      let busdPoolAddress = await uniswapFactory.getPair.call(eurxb.address, busd.address);

      if (usdtPoolAddress === constants.ZERO_ADDRESS) {
        await uniswapFactory.createPair(eurxb.address, usdt.address);
        usdtPoolAddress = await uniswapFactory.getPair.call(eurxb.address, usdt.address);
        console.log('usdtPoolAddress after deploy', usdtPoolAddress);
      } else {
        console.log('usdtPoolAddress address:', usdtPoolAddress);
      }
      const usdtPool = await UniswapV2Pair.at(usdtPoolAddress);

      if (busdPoolAddress === constants.ZERO_ADDRESS) {
        await uniswapFactory.createPair(eurxb.address, busd.address);
        busdPoolAddress = await uniswapFactory.getPair.call(eurxb.address, busd.address);
        console.log('busdPoolAddress after deploy', busdPoolAddress);
      } else {
        console.log('busdPoolAddress address:', busdPoolAddress);
      }
      const busdPool = await UniswapV2Pair.at(busdPoolAddress);

      // configure balancer pools
      const bFactory = await BFactory.at('0x4Cab4b9E97458dc121D7a76F94eE067e85c0E833');

      await bFactory.newBPool();
      const usdcPoolAddress = await bFactory.getLastBPool();
      const usdcPool = await BPool.at(usdcPoolAddress);
      await eurxb.approve(usdcPool.address, ether('46'));
      await usdc.approve(usdcPool.address, ether('54'));
      await usdcPool.bind(eurxb.address, ether('46'), ether('23'));
      await usdcPool.bind(usdc.address, ether('54'), ether('27'));
      await usdcPool.setSwapFee(ether('0.001'));
      await usdcPool.finalize();
      console.log('finalize usdcPool at address:', usdcPool.address);

      await bFactory.newBPool();
      const daiPoolAddress = await bFactory.getLastBPool();
      const daiPool = await BPool.at(daiPoolAddress);
      await eurxb.approve(daiPool.address, ether('46'));
      await dai.approve(daiPool.address, ether('54'));
      await daiPool.bind(eurxb.address, ether('46'), ether('23'));
      await daiPool.bind(dai.address, ether('54'), ether('27'));
      await daiPool.setSwapFee(ether('0.001'));
      await daiPool.finalize();
      console.log('finalize daiPool at address:', daiPool.address);

      // configure our contracts
      await router.setBalancerPool(usdc.address, usdcPool.address);
      await router.setBalancerPool(dai.address, daiPool.address);
      await router.setUniswapPair(usdt.address, usdtPool.address);
      await router.setUniswapPair(busd.address, busdPool.address);
      console.log('set all pairs');

      await xbg.approve(sm.address, ether('12000'));
      await sm.configure([
        usdtPool.address, usdcPool.address, busdPool.address, daiPool.address]);
      await router.configure(uniswapRouter.address);
    } else {
      console.log('unsupported network', network);
    }
  });
};
