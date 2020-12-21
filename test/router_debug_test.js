const { assert } = require('chai');
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { increaseTime, currentTimestamp, DAY } = require('./utils/common');

const TetherToken = artifacts.require('TetherToken'); // USDT
const BUSDImplementation = artifacts.require('BUSDImplementation'); // BUSD

const MockToken = artifacts.require('MockToken');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

const WETH9 = artifacts.require('WETH9');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');

const EURxb = artifacts.require('EURxb');

contract('Router tests for USDT', (accounts) => {
  const owner = accounts[0];
  const recipient = accounts[1];
  const staker = accounts[2];
  const team = accounts[3];

  const newBalancer = accounts[4];
  const newTeam = accounts[5];

  const mockStableToken = accounts[6];

  // const uniswapTokens = ['USDT', 'BUSD'];
  const uniswapTokens = ['USDT'];

  let eurxb;
  let xbg;

  let staking;
  let router;

  let timestamp;

  let token = uniswapTokens[0];
  let pairAddress;
  let pair;

  let factory;
  let weth;
  let uniswap_router;

  beforeEach(async () => {
    eurxb = await EURxb.new(owner);
    await eurxb.configure(owner);
    await eurxb.mint(owner, web3.utils.toWei('1000000', 'ether'));

    xbg = await MockToken.new('xbg', 'xbg', web3.utils.toWei('500', 'ether'));

    await increaseTime(DAY);

    timestamp = (await currentTimestamp()) + DAY;
    staking = await StakingManager.new(xbg.address, timestamp + DAY, 150);

    await increaseTime(DAY);

    // if (uniswapTokens[i] === 'USDT') {
    token = await TetherToken.deployed();
    timestamp = await currentTimestamp();
    timestamp += DAY;
    router = await Router.new(
      team, staking.address, timestamp,
      token.address, mockStableToken, mockStableToken, mockStableToken, eurxb.address,
    );
    // }

    assert.equal(await eurxb.balanceOf(owner), web3.utils.toWei('1000000', 'ether'));
    assert.equal(await token.balanceOf(owner), web3.utils.toWei('1000000', 'ether'));

    // create uniswap router and dependancies
    factory = await UniswapV2Factory.new(owner);
    weth = await WETH9.new();
    uniswap_router = await UniswapV2Router02.new(factory.address, weth.address);
    await factory.createPair(eurxb.address, token.address);

    pairAddress = await factory.allPairs.call(new BN('0'));
    pair = await UniswapV2Pair.at(pairAddress);

    // let pp = await uniswap_library.pairFor(factory.address, token.address, eurxb.address);
    // console.log('uniswap pair = ', pp.address);
    console.log('test pair = ', pairAddress);

    await router.configure(uniswap_router.address, factory.address);
    await router.setUniswapPair(token.address, pair.address);

    //
    // await token.transfer(recipient, web3.utils.toWei('200', 'ether'));
    // await token.transfer(staker, web3.utils.toWei('200', 'ether'));
  });

  it('should return correct uniswap values', async () => {
    const printRatios = async function () {
      const { tokenRes, eurRes } = await router.getUinswapReservesRatio(token.address);
      console.log('ratio = ', tokenRes.toString(), '/', eurRes.toString());
    };

    const printBalances = async function (msg) {
      console.log('-------------', msg, '-------------');
      console.log('token router balance = ', (await token.balanceOf(router.address)).toString());
      console.log('eurxb router balance = ', (await eurxb.balanceOf(router.address)).toString());

      console.log('token team balance = ', (await token.balanceOf(team)).toString());

      console.log('token owner balance = ', (await token.balanceOf(owner)).toString());
      console.log('eur owner balance = ', (await eurxb.balanceOf(owner)).toString());

      console.log('token pair balance = ', (await token.balanceOf(pairAddress)).toString());
      console.log('eurxb pair balance = ', (await eurxb.balanceOf(pairAddress)).toString());

      console.log('router liquidity balance = ', await pair.balanceOf(router.address));
      console.log('--------------------------------------------------------------------')
    };

    await printBalances('at the beginning');

    // await eurxb.approve(router.address, web3.utils.toWei('1000000', 'ether'));
    // await eurxb.transfer(router.address, web3.utils.toWei('1000000', 'ether'));

    await printBalances('transfer eurxb to router');

    await printRatios();

    const expectedPair = await factory.getPair(token.address, eurxb.address);
    const reversedPair = await factory.getPair(eurxb.address, token.address);
    const routerPair = await router.pairFor(token.address);

    console.log('factory created pair =', expectedPair);
    console.log('factory reversed pair =', reversedPair);
    console.log('factory router library pair =', routerPair);

    expect(expectedPair, 'wrong pair address').equal(pairAddress);
    expect(expectedPair, 'pairs are not equal').equal(reversedPair);
    expect(routerPair, 'router pair is different').equal(routerPair);

    const eurResult = await router.calculateEuroAmount(token.address, web3.utils.toWei('50', 'ether'));
    console.log('euro amount = ', eurResult.toString());

    // await eurxb.approve(router.address, web3.utils.toWei('10000', 'ether'));
    // await token.approve(router.address, web3.utils.toWei('10000', 'ether'));
    //
    // await router.calculateAmounts(
    //     token.address,
    //     eurxb.address,
    //     web3.utils.toWei('50', 'ether'),
    //     eurResult,
    //     0,
    //     0
    //   );

    // expectEvent.inTransaction(tx, this.router, 'AmountsCalculated', { amountA: 1, amountB: 2});

    // await router.addLiquidity(token.address, web3.utils.toWei('100', 'ether'));
    //
    // await printBalances('router liquidity added');

    await increaseTime(DAY);
    timestamp = await currentTimestamp();
    timestamp += 10 * DAY;

    await eurxb.approve(uniswap_router.address, web3.utils.toWei('1000000', 'ether'));
    await token.approve(uniswap_router.address, web3.utils.toWei('1000000', 'ether'));

    console.log('owner = ', owner);
    console.log('router = ', router.address);
    console.log('uniswap router = ', uniswap_router.address);
    console.log('pair = ', pairAddress);
    console.log('token = ', token.address);
    console.log('eurxb = ', eurxb.address);
    console.log('recipient = ', recipient);

    await uniswap_router.addLiquidity(
      token.address,
      eurxb.address,
      web3.utils.toWei('50', 'ether'),
      eurResult,
      0,
      0,
      router.address,
      timestamp,
    );

    await printRatios();

    await printBalances('uniswap router liquidity added');

    // assert.equal(await pair.balanceOf(owner), web3.utils.toWei('100', 'ether'));
  });
});
