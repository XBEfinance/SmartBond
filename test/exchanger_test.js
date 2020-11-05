const { assert } = require('chai');

const Exchanger = artifacts.require('Exchanger');
const MockToken = artifacts.require('MockToken');

contract('Exchanger', (accounts) => {
  const router = accounts[1];

  let USDT;
  let USDC;
  let BUSD;
  let DAI;
  let EURxb;

  let exchanger;

  beforeEach(async () => {
    USDT = await MockToken.new('USDT', 'USDT', web3.utils.toWei('100', 'ether'));
    USDC = await MockToken.new('USDC', 'USDC', web3.utils.toWei('100', 'ether'));
    BUSD = await MockToken.new('BUSD', 'BUSD', web3.utils.toWei('100', 'ether'));
    DAI = await MockToken.new('DAI', 'DAI', web3.utils.toWei('100', 'ether'));

    await USDT.transfer(router, web3.utils.toWei('100', 'ether'));

    EURxb = await MockToken.new('EURxb', 'EURxb', web3.utils.toWei('100', 'ether'));
    exchanger = await Exchanger.new(
      USDT.address, USDC.address, BUSD.address, DAI.address, EURxb.address,
    );
    await EURxb.transfer(exchanger.address, web3.utils.toWei('100', 'ether'));
  });

  it('should return correct balance EURxb values', async () => {
    await USDT.approve(exchanger.address, web3.utils.toWei('54', 'ether'), { from: router });
    await exchanger.exchange(USDT.address, web3.utils.toWei('54', 'ether'), { from: router });
    const balance = await EURxb.balanceOf(router);
    assert.equal(web3.utils.fromWei(balance, 'ether'), 46);
  });
});
