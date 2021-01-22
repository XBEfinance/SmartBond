const { expectRevert, ether, BN, time } = require('@openzeppelin/test-helpers');

const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect } = chai;

const FiatTokenV2 = artifacts.require('FiatTokenV2'); // USDC
const Dai = artifacts.require('Dai'); // DAI
const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD

const MockToken = artifacts.require('MockToken');

const BFactory = artifacts.require('BFactory'); // Balancer Protocol
const BPool = artifacts.require('BPool');

const WETH9 = artifacts.require('WETH9'); // Uniswap Protocol
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

function usd (n) {
  return new BN(web3.utils.toWei(n, 'Mwei'));
}

contract('Router', ([owner, alice, bob, team, newTeam]) => {
  before(async () => {
    // deploy eurxbMock
    this.eurxb = await MockToken.new('EURxb', 'EURxb', ether('50000'));

    // deploy uniswap protocol
    const uniswapFactory = await UniswapV2Factory.new(owner);
    const weth = await WETH9.new();
    this.uniswapRouter = await UniswapV2Router02.new(uniswapFactory.address, weth.address);

    // deploy balancer protocol
    const bFactory = await BFactory.new();

    // deploy and configure USDT
    this.usdt = await TetherToken.new(web3.utils.toWei('1000000', 'Mwei'), 'Tether USD', 'USDT', 6);

    // deploy and configure BUSD
    this.busd = await BUSDImplementation.new();
    await this.busd.unpause();
    await this.busd.increaseSupply(ether('1000000'));

    // deploy and configure USDC
    this.usdc = await FiatTokenV2.new();
    await this.usdc.initialize('USD Coin', 'USDC', 'USD', 6, owner, owner, owner, owner);
    await this.usdc.configureMinter(owner, web3.utils.toWei('1000000', 'Mwei'));
    await this.usdc.mint(owner, web3.utils.toWei('1000000', 'Mwei'));

    // deploy and configure DAI
    this.dai = await Dai.new(1);
    await this.dai.mint(owner, ether('1000000'));

    // create USDT uniswap pool
    await uniswapFactory.createPair(this.eurxb.address, this.usdt.address);
    const usdtPoolAddress = await uniswapFactory.getPair.call(this.eurxb.address,
      this.usdt.address);
    this.usdtPool = await UniswapV2Pair.at(usdtPoolAddress);

    // create BUSD uniswap pool
    await uniswapFactory.createPair(this.eurxb.address, this.busd.address);
    const busdPoolAddress = await uniswapFactory.getPair.call(this.eurxb.address,
      this.busd.address);
    this.busdPool = await UniswapV2Pair.at(busdPoolAddress);

    // create USDC balancer pool
    await bFactory.newBPool();
    const usdcPoolAddress = await bFactory.getLastBPool();
    this.usdcPool = await BPool.at(usdcPoolAddress);
    await this.eurxb.approve(this.usdcPool.address, ether('46'));
    await this.usdc.approve(this.usdcPool.address, usd('54'));
    await this.usdcPool.bind(this.eurxb.address, ether('46'),ether('25'));
    await this.usdcPool.bind(this.usdc.address, usd('54'), ether('25'));
    await this.usdcPool.setSwapFee(ether('0.001'));
    await this.usdcPool.finalize();

    // create DAI balancer pool
    await bFactory.newBPool();
    const daiPoolAddress = await bFactory.getLastBPool();
    this.daiPool = await BPool.at(daiPoolAddress);
    await this.eurxb.approve(this.daiPool.address, ether('46'));
    await this.dai.approve(this.daiPool.address, ether('54'));
    await this.daiPool.bind(this.eurxb.address, ether('46'), ether('25'));
    await this.daiPool.bind(this.dai.address, ether('54'), ether('25'));
    await this.daiPool.setSwapFee(ether('0.001'));
    await this.daiPool.finalize();
  });

  beforeEach(async () => {
    const xbg = await MockToken.new('xbg', 'xbg', ether('12000'));
    this.sm = await StakingManager.new(xbg.address, await time.latest());
    await xbg.approve(this.sm.address, ether('12000'));

    this.router = await Router.new(
      team, this.sm.address, await time.latest(),
      this.usdt.address, this.usdc.address, this.busd.address,
      this.dai.address, this.eurxb.address,
    );

    await this.router.setBalancerPool(this.usdc.address, this.usdcPool.address);
    await this.router.setBalancerPool(this.dai.address, this.daiPool.address);
    await this.router.setUniswapPair(this.usdt.address, this.usdtPool.address);
    await this.router.setUniswapPair(this.busd.address, this.busdPool.address);

    await this.sm.configure([
      this.usdtPool.address, this.usdcPool.address, this.busdPool.address, this.daiPool.address]);
    await this.router.configure(this.uniswapRouter.address);

    await this.eurxb.transfer(this.router.address, ether('10000'));
  });

  describe('add Liquidity to USDT pool', () => {
    beforeEach(async () => {
      await this.usdt.transfer(alice, usd('1000'), { from: owner });
      await this.usdt.approve(this.router.address, usd('1000'), { from: alice });
    });

    it('when user send USDT to Router', async () => {
      await this.router.addLiquidity(this.usdt.address, usd('1000'), { from: alice });

      const balance = await this.usdtPool.balanceOf(this.sm.address);
    });
  });

  describe('add Liquidity to BUSD pool', () => {
    beforeEach(async () => {
      await this.busd.transfer(alice, ether('1000'), { from: owner });
      await this.busd.approve(this.router.address, ether('1000'), { from: alice });
    });

    it('when user send BUSD to Router', async () => {
      await this.router.addLiquidity(this.busd.address, ether('1000'), { from: alice });

      const balance = await this.busdPool.balanceOf(this.sm.address);
    });
  });

  describe('add Liquidity to USDC pool', () => {
    beforeEach(async () => {
      await this.usdc.transfer(alice, usd('1000'), { from: owner });
      await this.usdc.approve(this.router.address, usd('1000'), { from: alice });
    });

    it('when user send USDC to Router', async () => {
      await this.router.addLiquidity(this.usdc.address, usd('1000'), { from: alice });

      const balance = await this.usdcPool.balanceOf(this.sm.address);
    });
  });

  describe('add Liquidity to DAI pool', () => {
    beforeEach(async () => {
      await this.dai.transfer(alice, ether('1000'), { from: owner });
      await this.dai.approve(this.router.address, ether('1000'), { from: alice });
    });

    it('when user send DAI to Router', async () => {
      await this.router.addLiquidity(this.dai.address, ether('1000'), { from: alice });

      const balance = await this.daiPool.balanceOf(this.sm.address);
    });
  });
});
