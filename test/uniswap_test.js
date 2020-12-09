const { assert } = require('chai');

const {
  BN,
} = require('@openzeppelin/test-helpers');

const { currentTimestamp, DAY } = require('./utils/common');

const TetherToken = artifacts.require('TetherToken');
const WETH9 = artifacts.require('WETH9');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const EURxb = artifacts.require('EURxb');

contract('Router', ([owner, alice, bob]) => {
  it('test using uniswap', async () => {
    const factory = await UniswapV2Factory.new(owner);
    const weth = await WETH9.new();
    const router = await UniswapV2Router02.new(factory.address, weth.address);

    // const router = await UniswapV2Router02.deployed();

    const eurxb = await EURxb.new(owner);
    await eurxb.configure(owner);
    await eurxb.mint(owner, web3.utils.toWei('1000000', 'ether'));
    const usdt = await TetherToken.deployed();

    assert.equal(await eurxb.balanceOf(owner), web3.utils.toWei('1000000', 'ether'));
    assert.equal(await usdt.balanceOf(owner), web3.utils.toWei('12042213561', 'ether'));

    await eurxb.approve(router.address, web3.utils.toWei('1000000', 'ether'));
    await usdt.approve(router.address, web3.utils.toWei('12042213561', 'ether'));

    let timestamp = await currentTimestamp();
    timestamp += DAY;
    await router.addLiquidity(
      eurxb.address,
      usdt.address,
      web3.utils.toWei('10000', 'ether'),
      web3.utils.toWei('10000', 'ether'),
      0,
      0,
      alice,
      timestamp,
    );

    // const factory = await UniswapV2Factory.deployed();
    const pairAddress = await factory.allPairs.call(new BN('0'));
    const pair = await UniswapV2Pair.at(pairAddress);

    const balanceAlice = await pair.balanceOf(alice);
    console.log('balanceAlice: ', balanceAlice.toString());

    await router.addLiquidity(
      eurxb.address,
      usdt.address,
      web3.utils.toWei('10000', 'ether'),
      web3.utils.toWei('5000', 'ether'),
      0,
      0,
      bob,
      timestamp
    );

    const balanceBob = await pair.balanceOf(bob);
    console.log('balanceBob: ', balanceBob.toString());
  });
});
