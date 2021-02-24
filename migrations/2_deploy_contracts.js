// const WETH9 = artifacts.require('WETH9'); // Wrapper Eth
const UniswapV2Factory = artifacts.require('UniswapV2Factory'); // Uniswap Factory
const UniswapV2Pair = artifacts.require('UniswapV2Pair'); // Uniswap Pair
const UniswapV2Router02 = artifacts.require('UniswapV2Router02'); // Uniswap Router

const BFactory = artifacts.require('BFactory'); // Balancer
const BPool = artifacts.require('BPool'); // Balancer
const BalancerRouter = artifacts.require('BalancerRouter');
const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD
const FiatTokenV2 = artifacts.require('FiatTokenV2'); // USDC
const Dai = artifacts.require('Dai'); // DAI

const LinkedList = artifacts.require('LinkedList');
const MockLinkedList = artifacts.require('MockLinkedList');

const EURxb = artifacts.require('EURxb');
const XBE = artifacts.require('XBE');

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

const baseSecurityURI = 'https://nft.eurxb.finance/security/';
const baseBondURI = 'https://nft.eurxb.finance/bond/';

const usd = (n) => web3.utils.toWei(n, 'Mwei');
const ether = (n) => web3.utils.toWei(n, 'ether');

module.exports = function (deployer, network) {
  deployer.then(async () => {
    if (network === 'test' || network === 'soliditycoverage') {
      await deployer.deploy(LinkedList);
      await deployer.link(LinkedList, MockLinkedList);
      await deployer.link(LinkedList, EURxb);

      await deployer.deploy(TokenAccessRoles);
      await deployer.link(TokenAccessRoles, BondTokenMock);
      await deployer.link(TokenAccessRoles, BondToken);
      await deployer.link(TokenAccessRoles, SecurityAssetToken);
      await deployer.link(TokenAccessRoles, DDP);
      await deployer.link(TokenAccessRoles, EURxb);
    } else if (network.startsWith('rinkeby')) {
      if (network === 'rinkeby_part_1' || network === 'rinkeby_part_1-fork') {
        await deployer.deploy(LinkedList, { overwrite: false });
        await deployer.link(LinkedList, EURxb);

        await deployer.deploy(TokenAccessRoles, { overwrite: false });
        await deployer.link(TokenAccessRoles, BondToken);
        await deployer.link(TokenAccessRoles, SecurityAssetToken);
        await deployer.link(TokenAccessRoles, DDP);
        await deployer.link(TokenAccessRoles, EURxb);

        const multisig = await deployer.deploy(
          Multisig, [
            process.env.FOUNDER_1,
            process.env.FOUNDER_2,
            process.env.FOUNDER_3,
            process.env.FOUNDER_4,
            process.env.FOUNDER_5],
          3,
        );
        const allowList = await deployer.deploy(AllowList, multisig.address);
        const bond = await deployer.deploy(BondToken, baseBondURI);
        const sat = await deployer.deploy(
          SecurityAssetToken, baseSecurityURI, multisig.address, bond.address, allowList.address,
        );
        const ddp = await deployer.deploy(DDP, multisig.address);
        const eurxb = await deployer.deploy(EURxb, multisig.address);

        // deploy Router and StakingManager contracts
        const xbe = await deployer.deploy(XBE, ether('15000'));
        await deployer.deploy(
          StakingManager, xbe.address, process.env.START_TIME,
        );

        await deployer.deploy(Router, process.env.TEAM_ACCOUNT);

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

        await multisig.allowAccount(process.env.TOKENS_OWNER_1);
        await multisig.allowAccount(process.env.TOKENS_OWNER_2);
        await multisig.allowAccount(process.env.TOKENS_OWNER_3);
        await multisig.allowAccount(process.env.TOKENS_OWNER_4);
        await multisig.allowAccount(process.env.TOKENS_OWNER_5);
        await multisig.allowAccount(process.env.TOKENS_OWNER_6);
        await multisig.allowAccount(process.env.TOKENS_OWNER_7);
      } else if (network === 'rinkeby_part_2' || network === 'rinkeby_part_2-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 27; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 1);
        }
      } else if (network === 'rinkeby_part_3' || network === 'rinkeby_part_3-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 26; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 28);
        }
      } else if (network === 'rinkeby_part_4' || network === 'rinkeby_part_4-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 21; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_2, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 54);
        }
      } else if (network === 'rinkeby_part_5' || network === 'rinkeby_part_5-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_3, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 75);
        }
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_4, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 85);
        }
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 95);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 96);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 97);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 98);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 99);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_7, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 100);

      } else if (network === 'rinkeby_part_6' || network === 'rinkeby_part_6-fork') {
        const eurxb = await EURxb.deployed();
        // get stable coins contracts
        const usdt = await TetherToken.at('0x909f156198674167a8D42B6453179A26871Fbc96');
        const usdc = await FiatTokenV2.at('0x4AE8c5d002e261e7e01c2A15527ce08D7528549f');
        const busd = await BUSDImplementation.at('0x6a0ad5F311D1B626876d622fd8bde468C470Ee13');
        const dai = await Dai.at('0xAd443D36e493e79C4eEe6600506446a43115E614');
        // get contracts from part one
        const xbe = await XBE.deployed();
        const sm = await StakingManager.deployed();
        const router = await Router.deployed();

        // configure uniswap pools
        const uniswapRouter = await UniswapV2Router02.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
        const uniswapFactory = await UniswapV2Factory.at('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');

        let usdtPoolAddress = await uniswapFactory.getPair.call(eurxb.address, usdt.address);
        let busdPoolAddress = await uniswapFactory.getPair.call(eurxb.address, busd.address);

        if (usdtPoolAddress === '0x0000000000000000000000000000000000000000') {
          await uniswapFactory.createPair(eurxb.address, usdt.address);
          usdtPoolAddress = await uniswapFactory.getPair.call(eurxb.address, usdt.address);
          console.log('usdtPoolAddress after deploy', usdtPoolAddress);
        } else {
          console.log('usdtPoolAddress address:', usdtPoolAddress);
        }
        const usdtPool = await UniswapV2Pair.at(usdtPoolAddress);

        if (busdPoolAddress === '0x0000000000000000000000000000000000000000') {
          await uniswapFactory.createPair(eurxb.address, busd.address);
          busdPoolAddress = await uniswapFactory.getPair.call(eurxb.address, busd.address);
          console.log('busdPoolAddress after deploy', busdPoolAddress);
        } else {
          console.log('busdPoolAddress address:', busdPoolAddress);
        }
        const busdPool = await UniswapV2Pair.at(busdPoolAddress);

        // configure balancer pools
        const bFactory = await BFactory.at('0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd');
        const bRouter = await BalancerRouter.new(bFactory.address);

        await eurxb.transfer(bRouter.address, ether('90.497737'));
        await usdc.transfer(bRouter.address, usd('54.751131'));
        await dai.transfer(bRouter.address, ether('54.751131'));
        let poolLength = await bRouter.getPoolLength();
        await bRouter.createNewPool(
          eurxb.address, ether('45.248868'), ether('25'),
          usdc.address, usd('54.751131'), ether('25'),
          ether('0.003'),
        );
        const addressUsdcPool = await bRouter.getPool(poolLength);
        console.log('finalize usdcPool at address:', addressUsdcPool);

        poolLength = await bRouter.getPoolLength();
        await bRouter.createNewPool(
          eurxb.address, ether('45.248868'), ether('25'),
          dai.address, ether('54.751131'), ether('25'),
          ether('0.003'),
        );
        const addressDaiPool = await bRouter.getPool(poolLength);
        console.log('finalize daiPool at address:', addressDaiPool);

        // configure our contractstw
        await xbe.approve(sm.address, ether('12000'));
        await sm.configure([
          usdtPool.address, addressUsdcPool, busdPool.address, addressDaiPool]);
        await router.configure(sm.address, uniswapRouter.address,
          usdt.address, usdc.address, busd.address, dai.address,
          eurxb.address);

        await eurxb.transfer(router.address, ether('100000'));
      } else {
        console.log('unsupported rinkeby fork', network);
      }
    } else if (network.startsWith('mainnet')) {
      if (network === 'mainnet_part_1' || network === 'mainnet_part_1-fork') {
        await deployer.deploy(LinkedList, { overwrite: false });
        await deployer.link(LinkedList, EURxb);

        await deployer.deploy(TokenAccessRoles, { overwrite: false });
        await deployer.link(TokenAccessRoles, BondToken);
        await deployer.link(TokenAccessRoles, SecurityAssetToken);
        await deployer.link(TokenAccessRoles, DDP);
        await deployer.link(TokenAccessRoles, EURxb);

        const multisig = await deployer.deploy(
          Multisig, [
            process.env.FOUNDER_1,
            process.env.FOUNDER_2,
            process.env.FOUNDER_3,
            process.env.FOUNDER_4,
            process.env.FOUNDER_5],
          3,
        );
        const allowList = await deployer.deploy(AllowList, multisig.address);
        const bond = await deployer.deploy(BondToken, baseBondURI);
        const sat = await deployer.deploy(
          SecurityAssetToken, baseSecurityURI, multisig.address, bond.address, allowList.address,
        );
        const ddp = await deployer.deploy(DDP, multisig.address);
        const eurxb = await deployer.deploy(EURxb, multisig.address);

        // deploy Router and StakingManager contracts
        const xbe = await deployer.deploy(XBE, ether('15000'));
        await deployer.deploy(
          StakingManager, xbe.address, process.env.START_TIME,
        );

        await deployer.deploy(Router, process.env.TEAM_ACCOUNT);

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

        await multisig.allowAccount(process.env.TOKENS_OWNER_1);
        await multisig.allowAccount(process.env.TOKENS_OWNER_2);
        await multisig.allowAccount(process.env.TOKENS_OWNER_3);
        await multisig.allowAccount(process.env.TOKENS_OWNER_4);
        await multisig.allowAccount(process.env.TOKENS_OWNER_5);
        await multisig.allowAccount(process.env.TOKENS_OWNER_6);
        await multisig.allowAccount(process.env.TOKENS_OWNER_7);
      } else if (network === 'mainnet_part_2' || network === 'mainnet_part_2-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 27; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 1);
        }
      } else if (network === 'mainnet_part_3' || network === 'mainnet_part_3-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 26; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_1, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 28);
        }
      } else if (network === 'mainnet_part_4' || network === 'mainnet_part_4-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 21; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_2, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 54);
        }
      } else if (network === 'mainnet_part_5' || network === 'mainnet_part_5-fork') {
        const multisig = await Multisig.deployed();
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_3, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 75);
        }
        for (let i = 0; i < 10; ++i) {
          await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_4, '1333333333333333333333334',
            365 * 86400 * 4);
          console.log('minted SAT/Bond token #', i + 85);
        }
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 95);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 96);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_5, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 97);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 98);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_6, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 99);
        await multisig.mintSecurityAssetToken(process.env.TOKENS_OWNER_7, '1333333333333333333333334',
          365 * 86400 * 4);
        console.log('minted SAT/Bond token #', 100);

      } else if (network === 'mainnet_part_6' || network === 'mainnet_part_6-fork') {
        const eurxb = await EURxb.deployed();
        // get stable coins contracts
        const usdt = await TetherToken.at('0xdAC17F958D2ee523a2206206994597C13D831ec7');
        const usdc = await FiatTokenV2.at('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
        const busd = await BUSDImplementation.at('0x4Fabb145d64652a948d72533023f6E7A623C7C53');
        const dai = await Dai.at('0x6B175474E89094C44Da98b954EedeAC495271d0F');
        // get contracts from part one
        const xbe = await XBE.deployed();
        const sm = await StakingManager.deployed();
        const router = await Router.deployed();

        // configure uniswap pools
        const uniswapRouter = await UniswapV2Router02.at('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
        const uniswapFactory = await UniswapV2Factory.at('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f');

        let usdtPoolAddress = await uniswapFactory.getPair.call(eurxb.address, usdt.address);
        let busdPoolAddress = await uniswapFactory.getPair.call(eurxb.address, busd.address);

        if (usdtPoolAddress === '0x0000000000000000000000000000000000000000') {
          await uniswapFactory.createPair(eurxb.address, usdt.address);
          usdtPoolAddress = await uniswapFactory.getPair.call(eurxb.address, usdt.address);
          console.log('usdtPoolAddress after deploy', usdtPoolAddress);
        } else {
          console.log('usdtPoolAddress address:', usdtPoolAddress);
        }
        const usdtPool = await UniswapV2Pair.at(usdtPoolAddress);

        if (busdPoolAddress === '0x0000000000000000000000000000000000000000') {
          await uniswapFactory.createPair(eurxb.address, busd.address);
          busdPoolAddress = await uniswapFactory.getPair.call(eurxb.address, busd.address);
          console.log('busdPoolAddress after deploy', busdPoolAddress);
        } else {
          console.log('busdPoolAddress address:', busdPoolAddress);
        }
        const busdPool = await UniswapV2Pair.at(busdPoolAddress);

        // configure balancer pools
        const bFactory = await BFactory.at('0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd');
        // const bRouter = await BalancerRouter.new(bFactory.address);
        const bRouter = await BalancerRouter.at('0xdea8081caa3205f85e21227cbf4f211509674f60');

        await eurxb.transfer(bRouter.address, ether('90.497737'));
        await usdc.transfer(bRouter.address, usd('54.751131'));
        await dai.transfer(bRouter.address, ether('54.751131'));
        let poolLength = await bRouter.getPoolLength();
        await bRouter.createNewPool(
          eurxb.address, ether('45.248868'), ether('25'),
          usdc.address, usd('54.751131'), ether('25'),
          ether('0.003'),
        );
        const addressUsdcPool = await bRouter.getPool(poolLength);
        console.log('finalize usdcPool at address:', addressUsdcPool);

        poolLength = await bRouter.getPoolLength();
        await bRouter.createNewPool(
          eurxb.address, ether('45.248868'), ether('25'),
          dai.address, ether('54.751131'), ether('25'),
          ether('0.003'),
        );
        const addressDaiPool = await bRouter.getPool(poolLength);
        console.log('finalize daiPool at address:', addressDaiPool);

        // configure our contractstw
        await xbe.approve(sm.address, ether('12000'));
        await sm.configure([
          usdtPool.address, addressUsdcPool, busdPool.address, addressDaiPool]);
        await router.configure(sm.address, uniswapRouter.address,
          usdt.address, usdc.address, busd.address, dai.address,
          eurxb.address);

        // await eurxb.transfer(router.address, ether('100000'));
      } else {
        console.log('unsupported mainnet fork', network);
      }
    } else {
      console.log('unsupported network', network);
    }
  });
};
