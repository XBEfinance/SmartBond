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

contract('Router', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const staker = accounts[2];
  const team = accounts[3];

  const newTeam = accounts[4];

  const mockStableToken = accounts[5];

  const balancerTokens = ['USDC', 'DAI'];
  describe('Router tests', async () => {
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
      // await this.eurxb.approve(this.usdcPool.address, web3.utils.fromWei('46', 'ether'));
      // await this.usdc.approve(this.usdcPool.address, web3.utils.fromWei('54', 'Mwei'));
      // await this.usdcPool.bind(this.eurxb.address, web3.utils.fromWei('46', 'ether'), web3.utils.fromWei('23', 'ether'));
      // await this.usdcPool.bind(this.usdc.address, web3.utils.fromWei('54', 'Mwei'), web3.utils.fromWei('27', 'ether'));
      // await this.usdcPool.setSwapFee(web3.utils.fromWei('0.001', 'ether'));
      // await this.usdcPool.finalize();
      // create DAI balancer pool
      await bFactory.newBPool();
      const daiPoolAddress = await bFactory.getLastBPool();
      this.daiPool = await BPool.at(daiPoolAddress);
      // await this.eurxb.approve(this.daiPool.address, web3.utils.fromWei('46', 'ether'));
      // await this.usdc.approve(this.daiPool.address, web3.utils.fromWei('54', 'ether'));
      // await this.daiPool.bind(this.eurxb.address, web3.utils.fromWei('46', 'ether'), web3.utils.fromWei('23', 'ether'));
      // await this.daiPool.bind(this.usdc.address, web3.utils.fromWei('54', 'ether'), web3.utils.fromWei('27', 'ether'));
      // await this.daiPool.setSwapFee(web3.utils.fromWei('0.001', 'ether'));
      // await this.daiPool.finalize();
    });

    beforeEach(async () => {
      const xbg = await MockToken.new('xbg', 'xbg', ether('12000'));
      this.staking = await StakingManager.new(xbg.address, await time.latest());
      await xbg.approve(this.staking.address, ether('12000'));

      this.router = await Router.new(
        team, this.staking.address, await time.latest(),
        this.usdt.address, this.busd.address, this.usdc.address,
        this.dai.address, this.eurxb.address,
      );

      await this.router.setBalancerPool(this.usdc.address, this.usdcPool.address);
      await this.router.setBalancerPool(this.dai.address, this.daiPool.address);
      await this.router.setUniswapPair(this.usdt.address, this.usdtPool.address);
      await this.router.setUniswapPair(this.busd.address, this.busdPool.address);

      await this.staking.configure([
        this.usdtPool.address, this.usdcPool.address, this.busdPool.address, this.daiPool.address]);
      await this.router.configure(this.uniswapRouter.address);
    });

    it('test', async () => {
    });

    describe('one', () => {
      describe('two', () => {
        it('test', async () => {
        });
      });
    });
  });
});
