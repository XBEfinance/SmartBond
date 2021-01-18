const {
  expectRevert,
  BN,
  ether,
  time,
} = require('@openzeppelin/test-helpers');

const chai = require('chai');
chai.use(require('chai-as-promised'));

const { expect } = chai;

const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD

const MockToken = artifacts.require('MockToken');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

const WETH9 = artifacts.require('WETH9');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

const EURxb = artifacts.require('EURxb');

contract('Router tests for USDT', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const staker = accounts[2];
  const team = accounts[3];

  const mockStableToken = accounts[6];

  const uniswapTokens = ['USDT', 'BUSD'];

  beforeEach(async () => {
    // configure all the components
    this.eurxb = await EURxb.new(owner);
    await this.eurxb.configure(owner);
    await this.eurxb.mint(owner, ether('1000000'));

    this.xbg = await MockToken.new('xbg', 'xbg', ether('12000'));

    this.token = await TetherToken.new(web3.utils.toWei('1000000', 'ether'), 'Tether USD', 'USDT', 6);

    expect(await this.eurxb.balanceOf(owner)).to.be.bignumber.equal(ether('1000000'));
    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(ether('1000000'));

    // create uniswap router and dependancies
    const factory = await UniswapV2Factory.new(owner);
    const weth = await WETH9.new();
    const uniswapRouter = await UniswapV2Router02.new(factory.address, weth.address);
    await factory.createPair(this.eurxb.address, this.token.address);

    this.pairAddress = await factory.allPairs.call(new BN('0'));

    const timestamp = await time.latest();
    this.staking = await StakingManager.new(this.xbg.address, timestamp);
    await this.xbg.approve(this.staking.address, ether('12000'));

    this.router = await Router.new(
      team, this.staking.address, timestamp,
      this.token.address, mockStableToken, mockStableToken, mockStableToken, this.eurxb.address,
    );

    const lpToken1 = await MockToken.new('LPToken', 'LPT1', ether('400.0'));
    const lpToken2 = await MockToken.new('LPToken', 'LPT2', ether('400.0'));
    const lpToken3 = await MockToken.new('LPToken', 'LPT3', ether('400.0'));

    await this.router.setUniswapPair(this.token.address, this.pairAddress);
    await this.staking.configure([
      this.pairAddress, lpToken1.address, lpToken2.address, lpToken3.address]);

    await this.router.configure(uniswapRouter.address);
    await this.router.setUniswapPair(this.token.address, this.pairAddress);
  });

  it('initial uniswap addLiquidity for pair USDT/EURxb in detail', async () => {
    await this.eurxb.transfer(this.router.address, ether('100'));
    await this.token.approve(this.router.address, ether('100'));

    expect(await this.eurxb.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('0.0'));

    await this.router.addLiquidity(this.token.address, ether('100'));

    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(ether('999900'));
    expect(await this.eurxb.balanceOf(this.router.address)).to.be.bignumber.equal(ether('57.407407407407407408'));
    expect(await this.eurxb.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('42.592592592592592592'));
    expect(await this.token.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('50.0'));
    expect(await this.xbg.balanceOf(owner)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('50.0'));

    await time.increase(time.duration.days(8));
    await this.staking.claimReward(owner);
    expect(await this.xbg.balanceOf(owner)).to.be.bignumber.equal(ether('3000'));
  });

  it('initial uniswap addLiquidity for pair USDT/EURxb in detail 1', async () => {
    await this.eurxb.transfer(this.router.address, ether('100'));
    await this.token.approve(this.router.address, ether('100'));

    expect(await this.eurxb.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('0.0'));

    await this.router.addLiquidity(this.token.address, ether('100'));

    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(ether('999900'));
    expect(await this.eurxb.balanceOf(this.router.address)).to.be.bignumber.equal(ether('57.407407407407407408'));
    expect(await this.eurxb.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('42.592592592592592592'));
    expect(await this.token.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('50.0'));
    expect(await this.xbg.balanceOf(owner)).to.be.bignumber.equal(ether('0.0'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('50'));

    await time.increase(time.duration.days(8));
    await this.staking.claimReward(owner);
    expect(await this.xbg.balanceOf(owner)).to.be.bignumber.equal(ether('3000'));
  });

  it('consecutive uniswap addLiquidity for pair USDT/EURxb success', async () => {
    await this.eurxb.transfer(this.router.address, ether('200'));
    await this.token.approve(this.router.address, ether('200'));

    await this.router.addLiquidity(this.token.address, ether('100'));
    await time.increase(time.duration.days(8));
    await this.staking.claimReward(owner);

    await this.router.addLiquidity(this.token.address, ether('100'));

    expect(await this.token.balanceOf(owner)).to.be.bignumber.equal(ether('999800'));
    expect(await this.eurxb.balanceOf(this.router.address)).to.be.bignumber.equal(ether('114.814814814814814816'));
    expect(await this.eurxb.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('85.185185185185185184'));
    expect(await this.token.balanceOf(this.pairAddress)).to.be.bignumber.equal(ether('100'));
    expect(await this.xbg.balanceOf(owner)).to.be.bignumber.equal(ether('3000'));
    expect(await this.token.balanceOf(team)).to.be.bignumber.equal(ether('100'));

    await expectRevert(this.staking.claimReward(owner), 'Reward is empty');
  });
});
