const { assert } = require('chai');

const { currentTimestamp } = require('./common');

const TetherToken = artifacts.require('TetherToken');
const UniswapV2Router02 = artifacts.require('./UniswapV2Router02');
const EURxb = artifacts.require('EURxb');

contract('Router', ([owner, alice, bob]) => {
  it('test using uniswap', async () => {
    const router = await UniswapV2Router02.deployed();

    const eurxb = await EURxb.new(owner);
    await eurxb.configure(owner);
    await eurxb.mint(owner, web3.utils.toWei('1000000', 'ether'));
    const usdt = await TetherToken.deployed();

    assert.equal(await eurxb.balanceOf(owner), web3.utils.toWei('1000000', 'ether'));
    assert.equal(await usdt.balanceOf(owner), web3.utils.toWei('12042213561', 'ether'));

    router.addLiquidity(
      eurxb.address,
      usdt.address,
      web3.utils.toWei('1000', 'ether'),
      web3.utils.toWei('1000', 'ether'),
      0,
      0,
      alice,
      currentTimestamp + 86400,
    );
  });
});
