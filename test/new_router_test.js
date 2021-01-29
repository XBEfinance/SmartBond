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

const usd = (n) => new BN(web3.utils.toWei(n, 'Mwei'));

const coinAmount = async (n, token) => {
  const decimals = await token.decimals();
  if (decimals.toString() === '6') {
    return usd(n);
  }
  if (decimals.toString() === '18') {
    return ether(n);
  }

  assert(false, 'unsupported decimals');
  return 0;
};

const calcExchangeEurxb = async (n, token) => {
  const coinsMultiplier = await coinAmount('27', token);
  return n.mul(ether('23')).div(coinsMultiplier);
};

const calcExchangeCoins = async (n, token) => {
  const coinsMultiplier = await coinAmount('27', token);
  return n.mul(coinsMultiplier).div(ether('23'));
};

const setupEpsilon = async (token) => {
  let minErrorEpsilon = ether('1').div(await coinAmount('1', token));
  if (minErrorEpsilon.lt(new BN('1000'))) {
    minErrorEpsilon = new BN('1000');
  }
  return minErrorEpsilon;
};

const names = ['USDT', 'USDC', 'BUSD', 'DAI'];
let coins = [];
let pools = [];
let types = [];

contract('Router', ([owner, alice, team, newTeam]) => {
  beforeEach(async () => {
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
    this.startTime = (await time.latest()).add(time.duration.hours('1'));
    this.sm = await StakingManager.new(xbg.address, this.startTime);
    this.router = await Router.new(team);

    // configure StakingManager contract
    await xbg.approve(this.sm.address, ether('12000'));
    await this.sm.configure([
      this.usdtPool.address, this.usdcPool.address, this.busdPool.address, this.daiPool.address]);
    // configure Router contract
    await this.router.configure(this.sm.address, this.uniswapRouter.address,
      this.usdt.address, this.usdc.address, this.busd.address, this.dai.address,
      this.eurxb.address);
    // send some EURxb tokens to Router contract
    this.eurxbRouterBalance = ether('1000');
    await this.eurxb.transfer(this.router.address, this.eurxbRouterBalance);
  });

  it('show all view parameters', async () => {
    expect(await this.router.isClosedContract()).to.be.equal(false);
    expect(await this.router.stakingManager()).to.be.equal(this.sm.address);
    expect(await this.router.uniswapRouter()).to.be.equal(this.uniswapRouter.address);
    expect(await this.router.eurxb()).to.be.equal(this.eurxb.address);
    expect(await this.router.startTime()).to.be.bignumber.equal(this.startTime);
    expect(await this.router.endTime()).to.be.bignumber.equal(this.startTime.add(time.duration.days('7')));
    expect(await this.router.teamAddress()).to.be.equal(team);
    expect(await this.router.getPoolAddress(this.usdt.address)).to.be.equal(this.usdtPool.address);
    expect(await this.router.getPoolAddress(this.usdc.address)).to.be.equal(this.usdcPool.address);
    expect(await this.router.getPoolAddress(this.busd.address)).to.be.equal(this.busdPool.address);
    expect(await this.router.getPoolAddress(this.dai.address)).to.be.equal(this.daiPool.address);
  });

  describe('change team address', () => {
    it('when owner call setTeamAddress function', async () => {
      await this.router.setTeamAddress(newTeam, { from: owner });

      expect(await this.router.teamAddress()).to.be.equal(newTeam);
    });
  });

  describe('other users can not call', () => {
    it('setTeamAddress', async () => {
      await expectRevert(this.router.setTeamAddress(newTeam, { from: alice }), 'Ownable: caller is not the owner');
    });

    it('closeContract', async () => {
      time.increase(time.duration.hours('1'));
      time.increase(time.duration.days('7'));
      await expectRevert(this.router.closeContract({ from: alice }), 'Ownable: caller is not the owner');
    });
  });


  describe('all eurxb from router send to team address', () => {
    it('when owner has closed contract', async () => {
      time.increase(time.duration.hours('1'));
      time.increase(time.duration.days('7'));

      const balanceTeamBefore = await this.eurxb.balanceOf(team);
      const balanceRouterBefore = await this.eurxb.balanceOf(this.router.address);
      await this.router.closeContract({ from: owner });

      expect(await this.router.isClosedContract()).to.be.equal(true);

      const balanceRouter = await this.eurxb.balanceOf(this.router.address);
      expect(balanceRouter).to.be.bignumber.lte(new BN('1000'));

      const balanceTeam = await this.eurxb.balanceOf(team);
      expect(balanceTeam).to.be.bignumber.gte(balanceTeamBefore.add(balanceRouterBefore));
    });
  });

  for (let i = 0; i < 4; ++i) {
    describe('add liquidity to', () => {
      beforeEach(async () => {
        this.depositedAmount = await coinAmount('1000', coins[i]);
        await coins[i].transfer(alice, this.depositedAmount, { from: owner });
        await coins[i].approve(this.router.address, this.depositedAmount, { from: alice });
      });

      it('when user send some coins to Router', async () => {
        time.increase(time.duration.hours('1'));
        console.log('\t', names[i], 'pool');
        const minErrorEpsilon = await setupEpsilon(coins[i]);
        // get balance pool before add liquidity
        const coinPoolBalanceBefore = await coins[i].balanceOf(pools[i].address);

        // add liquidity to Router contract
        await this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice });

        // check coins pool balance
        const coinPoolBalance = await coins[i].balanceOf(pools[i].address);
        let expectedCoinPoolBalance = this.depositedAmount.div(new BN('2'));
        expectedCoinPoolBalance = expectedCoinPoolBalance.add(coinPoolBalanceBefore);

        if (types[i] === 'uniswap') {
          expect(coinPoolBalance).to.be.bignumber.equal(expectedCoinPoolBalance);
        } else {
          expect(coinPoolBalance).to.be.bignumber.gte(expectedCoinPoolBalance.sub(minErrorEpsilon));
          expect(coinPoolBalance).to.be.bignumber.lte(expectedCoinPoolBalance.add(minErrorEpsilon));
        }

        // check eurxb pool balance
        const eurxbPoolBalance = await this.eurxb.balanceOf(pools[i].address);
        const expectedEurxbPoolBalance = await calcExchangeEurxb(coinPoolBalance, coins[i]);

        expect(eurxbPoolBalance).to.be.bignumber.gte(expectedEurxbPoolBalance.sub(minErrorEpsilon));
        expect(eurxbPoolBalance).to.be.bignumber.lte(expectedEurxbPoolBalance.add(minErrorEpsilon));

        // check creating LP tokens
        const lpTotalSupply = await pools[i].totalSupply();
        expect(lpTotalSupply).to.be.bignumber.gt(ether('0'));
        // all LP tokens has sent to StakingManager contract
        const lpTokenBalance = await pools[i].balanceOf(this.sm.address);
        if (types[i] === 'uniswap') {
          expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(new BN('1000')));
        } else {
          expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(ether('100')));
        }

        // check team coin balance
        const teamCoinBalance = await coins[i].balanceOf(team);
        const expectedTeamCoinBalance = this.depositedAmount.div(new BN('2'));
        if (types[i] === 'uniswap') {
          expect(teamCoinBalance).to.be.bignumber.equal(expectedTeamCoinBalance);
        } else {
          expect(teamCoinBalance).to.be.bignumber.gte(expectedTeamCoinBalance.sub(minErrorEpsilon));
          expect(teamCoinBalance).to.be.bignumber.lte(expectedTeamCoinBalance.add(minErrorEpsilon));
        }
      });
    });

    describe('add liquidity to', () => {
      beforeEach(async () => {
        this.depositedAmount = await coinAmount('10000', coins[i]);
        await coins[i].transfer(alice, this.depositedAmount, { from: owner });
        await coins[i].approve(this.router.address, this.depositedAmount, { from: alice });
      });

      it('when user send coins more than ERUxb Router balance', async () => {
        time.increase(time.duration.hours('1'));
        console.log('\t', names[i], 'pool');
        const minErrorEpsilon = await setupEpsilon(coins[i]);
        // get balance pool before add liquidity
        const coinPoolBalanceBefore = await coins[i].balanceOf(pools[i].address);

        // add liquidity to Router contract
        await this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice });

        // check coins pool balance
        const coinPoolBalance = await coins[i].balanceOf(pools[i].address);
        let expectedCoinPoolBalance = await calcExchangeCoins(this.eurxbRouterBalance, coins[i]);
        expectedCoinPoolBalance = expectedCoinPoolBalance.add(coinPoolBalanceBefore);
        if (types[i] === 'uniswap') {
          expect(coinPoolBalance).to.be.bignumber.equal(expectedCoinPoolBalance);
        } else {
          expect(coinPoolBalance).to.be.bignumber.gte(expectedCoinPoolBalance.sub(minErrorEpsilon));
          expect(coinPoolBalance).to.be.bignumber.lte(expectedCoinPoolBalance.add(minErrorEpsilon));
        }

        // check eurxb pool balance
        const eurxbPoolBalance = await this.eurxb.balanceOf(pools[i].address);
        const expectedEurxbPoolBalance = await calcExchangeEurxb(coinPoolBalance, coins[i]);

        expect(eurxbPoolBalance).to.be.bignumber.gte(expectedEurxbPoolBalance.sub(minErrorEpsilon));
        expect(eurxbPoolBalance).to.be.bignumber.lte(expectedEurxbPoolBalance.add(minErrorEpsilon));

        // check creating LP tokens
        const lpTotalSupply = await pools[i].totalSupply();
        expect(lpTotalSupply).to.be.bignumber.gt(ether('0'));
        // all LP tokens has sent to StakingManager contract
        const lpTokenBalance = await pools[i].balanceOf(this.sm.address);
        if (types[i] === 'uniswap') {
          expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(new BN('1000')));
        } else {
          expect(lpTokenBalance).to.be.bignumber.equal(lpTotalSupply.sub(ether('100')));
        }

        // check team coin balance
        const teamCoinBalance = await coins[i].balanceOf(team);
        const expectedTeamCoinBalance = await calcExchangeCoins(this.eurxbRouterBalance, coins[i]);
        if (types[i] === 'uniswap') {
          expect(teamCoinBalance).to.be.bignumber.equal(expectedTeamCoinBalance);
        } else {
          expect(teamCoinBalance).to.be.bignumber.gte(expectedTeamCoinBalance.sub(minErrorEpsilon));
          expect(teamCoinBalance).to.be.bignumber.lte(expectedTeamCoinBalance.add(minErrorEpsilon));
        }
      });
    });

    describe('add liquidity to', () => {
      beforeEach(async () => {
        this.depositedAmount = await coinAmount('1000', coins[i]);
        await coins[i].transfer(alice, this.depositedAmount, { from: owner });
        await coins[i].approve(this.router.address, this.depositedAmount, { from: alice });
      });

      it('when user send coins after end staking period', async () => {
        time.increase(time.duration.hours('1'));
        console.log('\t', names[i], 'pool');
        time.increase(time.duration.days('7'));
        const minErrorEpsilon = await setupEpsilon(coins[i]);
        // get balance pool before add liquidity
        const coinPoolBalanceBefore = await coins[i].balanceOf(pools[i].address);

        // add liquidity to Router contract
        await this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice });

        // check coins pool balance
        const coinPoolBalance = await coins[i].balanceOf(pools[i].address);
        let expectedCoinPoolBalance = this.depositedAmount.div(new BN('2'));
        expectedCoinPoolBalance = expectedCoinPoolBalance.add(coinPoolBalanceBefore);

        if (types[i] === 'uniswap') {
          expect(coinPoolBalance).to.be.bignumber.equal(expectedCoinPoolBalance);
        } else {
          expect(coinPoolBalance).to.be.bignumber.gte(expectedCoinPoolBalance.sub(minErrorEpsilon));
          expect(coinPoolBalance).to.be.bignumber.lte(expectedCoinPoolBalance.add(minErrorEpsilon));
        }

        // check eurxb pool balance
        const eurxbPoolBalance = await this.eurxb.balanceOf(pools[i].address);
        const expectedEurxbPoolBalance = await calcExchangeEurxb(coinPoolBalance, coins[i]);

        expect(eurxbPoolBalance).to.be.bignumber.gte(expectedEurxbPoolBalance.sub(minErrorEpsilon));
        expect(eurxbPoolBalance).to.be.bignumber.lte(expectedEurxbPoolBalance.add(minErrorEpsilon));

        // check creating LP tokens
        const lpTotalSupply = await pools[i].totalSupply();
        expect(lpTotalSupply).to.be.bignumber.gt(ether('0'));
        // all LP tokens has sent to user
        const lpTokenSMBalance = await pools[i].balanceOf(this.sm.address);
        expect(lpTokenSMBalance).to.be.bignumber.equal(new BN('0'));

        const lpTokenAliceBalance = await pools[i].balanceOf(alice);
        if (types[i] === 'uniswap') {
          expect(lpTokenAliceBalance).to.be.bignumber.equal(lpTotalSupply.sub(new BN('1000')));
        } else {
          expect(lpTokenAliceBalance).to.be.bignumber.equal(lpTotalSupply.sub(ether('100')));
        }

        // check team coin balance
        const teamCoinBalance = await coins[i].balanceOf(team);
        const expectedTeamCoinBalance = this.depositedAmount.div(new BN('2'));
        if (types[i] === 'uniswap') {
          expect(teamCoinBalance).to.be.bignumber.equal(expectedTeamCoinBalance);
        } else {
          expect(teamCoinBalance).to.be.bignumber.gte(expectedTeamCoinBalance.sub(minErrorEpsilon));
          expect(teamCoinBalance).to.be.bignumber.lte(expectedTeamCoinBalance.add(minErrorEpsilon));
        }
      });
    });

    describe('can not add liquidity', () => {
      beforeEach(async () => {
        this.depositedAmount = await coinAmount('1000', coins[i]);
        await coins[i].transfer(alice, this.depositedAmount, { from: owner });
        await coins[i].approve(this.router.address, this.depositedAmount, { from: alice });
      });

      it('if token is not supported', async () => {
        time.increase(time.duration.hours('1'));
        await expectRevert(
          this.router.addLiquidity(this.eurxb.address, this.depositedAmount, { from: alice }),
          'token is not supported',
        );
      });

      it('if startTime has not come yet', async () => {
        await expectRevert(
          this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice }),
          'The time has not come yet',
        );
      });

      it('when owner has closed contract', async () => {
        time.increase(time.duration.hours('1'));
        time.increase(time.duration.days('7'));

        await this.router.closeContract({ from: owner });

        await expectRevert(
          this.router.addLiquidity(coins[i].address, this.depositedAmount, { from: alice }),
          'Contract closed',
        );
      });
    });
  }
});
