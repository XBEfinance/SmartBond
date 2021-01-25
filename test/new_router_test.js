const { expectRevert, ether, BN, time } = require('@openzeppelin/test-helpers');

const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect, assert } = chai;

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

usd = (n) => new BN(web3.utils.toWei(n, 'Mwei'));

coinAmount = async (n, token) => {
  const decimals = await token.decimals();
  if (decimals.toString() === '6')
    return usd(n);
  else if (decimals.toString() === '18')
    return ether(n);
  else
    assert(false, 'unsupported decimals');
}

calcExchangeEurxb = async (n, token) => {
  const coinsMultiplier = await coinAmount('27', token);
  return n.mul(ether('23')).div(coinsMultiplier);
}

calcExchangeCoins = async (n, token) => {
  const coinsMultiplier = await coinAmount('27', token);
  return n.mul(coinsMultiplier).div(ether('23'));
}

const names = ['USDT', 'USDC', 'BUSD', 'DAI'];
let coins = [];
let pools = [];
let types = [];

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
    this.usdt = await TetherToken.new(usd('1000000'), 'Tether USD', 'USDT', 6);

    // deploy and configure BUSD
    this.busd = await BUSDImplementation.new();
    await this.busd.unpause();
    await this.busd.increaseSupply(ether('1000000'));

    // deploy and configure USDC
    this.usdc = await FiatTokenV2.new();
    await this.usdc.initialize('USD Coin', 'USDC', 'USD', 6, owner, owner, owner, owner);
    await this.usdc.configureMinter(owner, usd('1000000'));
    await this.usdc.mint(owner, usd('1000000'));

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

    coins = [this.usdt, this.usdc, this.busd, this.dai];
    pools = [this.usdtPool, this.usdcPool, this.busdPool, this.daiPool];
    types = ['uniswap', 'balancer', 'uniswap', 'balancer'];
  });

  beforeEach(async () => {
    // deploy
    const xbg = await MockToken.new('xbg', 'xbg', ether('12000'));
    this.sm = await StakingManager.new(xbg.address, await time.latest());
    this.router = await Router.new(team);

    // configure StakingManager contract
    await xbg.approve(this.sm.address, ether('12000'));
    await this.sm.configure([
      this.usdtPool.address, this.usdcPool.address, this.busdPool.address, this.daiPool.address]);
    // configure Router contract
    await this.router.configure(this.sm.address, this.uniswapRouter.address,
      this.usdt.address, this.usdc.address, this.busd.address, this.dai.address, this.eurxb.address);
    // send some EURxb tokens to Router contract
    this.eurxbRouterBalance = ether('1000');
    await this.eurxb.transfer(this.router.address, this.eurxbRouterBalance);
  });

  for (let i = 0; i < 4; ++i) {
    describe('add liquidity to', () => {
      beforeEach(async () => {
        this.depositedAmount = await coinAmount('1000', coins[i]);
        await coins[i].transfer(alice, this.depositedAmount, { from: owner });
        await coins[i].approve(this.router.address, this.depositedAmount, { from: alice });
      });

      it('when user send coins to Router', async () => {
        console.log('\t', names[i], 'pool');
        // get balance pool before add liquidity
        const coinPoolBalanceBefore = await coins[i].balanceOf(pools[i].address);

        // add liquidity to Router contract
        await this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice });

        // check coins pool balance
        const coinPoolBalance = await coins[i].balanceOf(pools[i].address);
        let expectedCoinPoolBalance = this.depositedAmount.div(new BN('2'));
        if (types[i] === 'uniswap') {
          expectedCoinPoolBalance = expectedCoinPoolBalance.add(coinPoolBalanceBefore);
          expect(coinPoolBalance).to.be.bignumber.equal(expectedCoinPoolBalance);
        }
        else {
          expectedCoinPoolBalance =
            expectedCoinPoolBalance.add(coinPoolBalanceBefore);
          expect(coinPoolBalance).to.be.bignumber.gte(expectedCoinPoolBalance.sub(new BN('1000')));
          expect(coinPoolBalance).to.be.bignumber.lte(expectedCoinPoolBalance.add(new BN('1000')));
        }

        // check eurxb pool balance
        const eurxbPoolBalance = await this.eurxb.balanceOf(pools[i].address);
        const expectedEurxbPoolBalance = await calcExchangeEurxb(coinPoolBalance, coins[i]);

        if (types[i] === 'uniswap')
          expect(eurxbPoolBalance).to.be.bignumber.equal(expectedEurxbPoolBalance);
        else {
          expect(eurxbPoolBalance).to.be.bignumber.gte(expectedEurxbPoolBalance.sub(new BN('1000')));
          expect(eurxbPoolBalance).to.be.bignumber.lte(expectedEurxbPoolBalance.add(new BN('1000')));
        }

        // check creating LP tokens
        const lpTotalSupply = await pools[i].totalSupply();
        expect(lpTotalSupply).to.be.bignumber.gt(ether('0'));
        // all LP tokens has sent to StakingManager contract
        const lpTokenBalance = await pools[i].balanceOf(this.sm.address);
        if (types[i] === 'uniswap')
          expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(new BN('1000')));
        else
          expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(ether('100')));

        // check team coin balance
        const teamCoinBalance = await coins[i].balanceOf(team);
        const expectedTeamCoinBalance = this.depositedAmount.div(new BN('2'));
        if (types[i] === 'uniswap')
          expect(teamCoinBalance).to.be.bignumber.equal(expectedTeamCoinBalance);
        else {
          expect(teamCoinBalance).to.be.bignumber.gte(expectedTeamCoinBalance.sub(new BN('1000')));
          expect(teamCoinBalance).to.be.bignumber.lte(expectedTeamCoinBalance.add(new BN('1000')));
        }
      });
    });

    // describe('add liquidity to', () => {
    //   beforeEach(async () => {
    //     this.depositedAmount = await coinAmount('10000', coins[i]);
    //     await coins[i].transfer(alice, this.depositedAmount, { from: owner });
    //     await coins[i].approve(this.router.address, this.depositedAmount, { from: alice });
    //   });
    //
    //   it('when user send coins more than ERUxb Router balance', async () => {
    //     console.log('\t', names[i], 'pool');
    //     // get balance pool before add liquidity
    //     const coinPoolBalanceBefore = await coins[i].balanceOf(pools[i].address);
    //
    //     // add liquidity to Router contract
    //     await this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice });
    //
    //     // check coins pool balance
    //     const coinPoolBalance = await coins[i].balanceOf(pools[i].address);
    //     let expectedCoinPoolBalance = await calcExchangeCoins(this.eurxbRouterBalance, coins[i]);
    //     if (types[i] === 'uniswap') {
    //       expectedCoinPoolBalance = expectedCoinPoolBalance.add(coinPoolBalanceBefore);
    //       expect(coinPoolBalance).to.be.bignumber.equal(expectedCoinPoolBalance);
    //     }
    //     else {
    //       expectedCoinPoolBalance =
    //         expectedCoinPoolBalance.add(coinPoolBalanceBefore);
    //       expect(coinPoolBalance).to.be.bignumber.gte(expectedCoinPoolBalance.sub(new BN('1000')));
    //       expect(coinPoolBalance).to.be.bignumber.lte(expectedCoinPoolBalance.add(new BN('1000')));
    //     }
    //
    //     // check eurxb pool balance
    //     const eurxbPoolBalance = await this.eurxb.balanceOf(pools[i].address);
    //     const expectedEurxbPoolBalance = this.eurxbRouterBalance;
    //
    //     if (types[i] === 'uniswap')
    //       expect(eurxbPoolBalance).to.be.bignumber.equal(expectedEurxbPoolBalance);
    //     else {
    //       expect(eurxbPoolBalance).to.be.bignumber.gte(expectedEurxbPoolBalance.sub(new BN('1000')));
    //       expect(eurxbPoolBalance).to.be.bignumber.lte(expectedEurxbPoolBalance.add(new BN('1000')));
    //     }
    //
    //     // check creating LP tokens
    //     const lpTotalSupply = await pools[i].totalSupply();
    //     expect(lpTotalSupply).to.be.bignumber.gt(ether('0'));
    //     // all LP tokens has sent to StakingManager contract
    //     const lpTokenBalance = await pools[i].balanceOf(this.sm.address);
    //     if (types[i] === 'uniswap')
    //       expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(new BN('1000')));
    //     else
    //       expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(ether('100')));
    //
    //     // check team coin balance
    //     const teamCoinBalance = await coins[i].balanceOf(team);
    //     const expectedTeamCoinBalance = await calcExchangeCoins(this.eurxbRouterBalance, coins[i]);
    //     if (types[i] === 'uniswap')
    //       expect(teamCoinBalance).to.be.bignumber.equal(expectedTeamCoinBalance);
    //     else {
    //       expect(teamCoinBalance).to.be.bignumber.gte(expectedTeamCoinBalance.sub(new BN('1000')));
    //       expect(teamCoinBalance).to.be.bignumber.lte(expectedTeamCoinBalance.add(new BN('1000')));
    //     }
    //   });
    // });
  }
});
