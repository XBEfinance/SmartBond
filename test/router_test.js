const { assert } = require('chai');

const Router = artifacts.require('Router');
const BPool = artifacts.require('BPool');
const BFactory = artifacts.require('BFactory');
const MockToken = artifacts.require('MockToken');

contract('Exchanger', (accounts) => {
  const recipient = accounts[1];
  const balancerAddr = accounts[2];

  let USDT;
  let USDC;
  let BUSD;
  let DAI;
  let EURxb;

  // let balancer;
  let router;

  beforeEach(async () => {
    USDT = await MockToken.new('USDT', 'USDT', web3.utils.toWei('400', 'ether'));
    USDC = await MockToken.new('USDC', 'USDC', web3.utils.toWei('400', 'ether'));
    BUSD = await MockToken.new('BUSD', 'BUSD', web3.utils.toWei('400', 'ether'));
    DAI = await MockToken.new('DAI', 'DAI', web3.utils.toWei('400', 'ether'));

    await USDT.transfer(recipient, web3.utils.toWei('100', 'ether'));
    this.bFactory = await BFactory.deployed();

    EURxb = await MockToken.new('EURxb', 'EURxb', web3.utils.toWei('400', 'ether'));

    // balancer = await BPool.new();
    // await EURxb.approve(balancer.address, web3.utils.toWei('100', 'ether'));
    // await USDT.approve(balancer.address, web3.utils.toWei('100', 'ether'));
    // await balancer.bind(EURxb.address, web3.utils.toWei('100', 'ether'), 50);
    // await balancer.bind(USDT.address, web3.utils.toWei('100', 'ether'), 50);
    // await balancer.setSwapFee(web3.utils.toWei('1', 'ether'));
    // await balancer.finalize();

    router = await Router.new(
      balancerAddr, USDT.address, USDC.address, BUSD.address, DAI.address, EURxb.address,
    );
    await EURxb.transfer(router.address, web3.utils.toWei('100', 'ether'));
  });

  it('should create new balance pool', async () => {
    await this.bFactory.newBPool(); // deploy new BPool contract
    const balancerAddress = await this.bFactory.getLastBPool(); // get deployed balancer address
    const balancer = await BPool.at(balancerAddress); // get deployed balancer contract
    await EURxb.approve(balancer.address, web3.utils.toWei('100', 'ether'));
    await USDT.approve(balancer.address, web3.utils.toWei('100', 'ether'));
    // await balancer.bind(EURxb.address, web3.utils.toWei('100', 'ether'), 50); // TODO: Fix that: revert ERR_MIN_WEIGHT -- Reason given: ERR_MIN_WEIGHT
    // await balancer.bind(USDT.address, web3.utils.toWei('100', 'ether'), 50);
    // await balancer.setSwapFee(web3.utils.toWei('1', 'ether'));
    // await balancer.finalize();
  });

  it('should return correct balance EURxb values', async () => {
    await USDT.approve(router.address, web3.utils.toWei('54', 'ether'), { from: recipient });
    await router.exchange(USDT.address, web3.utils.toWei('54', 'ether'), { from: recipient });
    const balance = await EURxb.balanceOf(recipient);
    assert.equal(web3.utils.fromWei(balance, 'ether'), 46);
  });
});
