const { assert } = require('chai');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const MockToken = artifacts.require('MockToken');
const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');

const Router = artifacts.require('Router');
const StakingManager = artifacts.require('StakingManager');

contract('Router', (accounts) => {
  const recipient = accounts[1];
  const staker = accounts[2];
  const team = accounts[3];

  let USDT;
  let USDC;
  let BUSD;
  let DAI;
  let EURxb;
  let gEURO;

  let balancer;
  let staking;
  let router;

  beforeEach(async () => {
    USDT = await MockToken.new('USDT', 'USDT', web3.utils.toWei('500', 'ether'));
    USDC = await MockToken.new('USDC', 'USDC', web3.utils.toWei('500', 'ether'));
    BUSD = await MockToken.new('BUSD', 'BUSD', web3.utils.toWei('500', 'ether'));
    DAI = await MockToken.new('DAI', 'DAI', web3.utils.toWei('500', 'ether'));

    EURxb = await MockToken.new('EURxb', 'EURxb', web3.utils.toWei('500', 'ether'));
    gEURO = await MockToken.new('gEURO', 'gEURO', web3.utils.toWei('500', 'ether'));

    await USDT.transfer(recipient, web3.utils.toWei('200', 'ether'));
    await USDT.transfer(staker, web3.utils.toWei('200', 'ether'));

    this.bFactory = await BFactory.deployed();
    await this.bFactory.newBPool();
    const balancerAddress = await this.bFactory.getLastBPool();
    balancer = await BPool.at(balancerAddress);

    await EURxb.approve(balancer.address, web3.utils.toWei('46', 'ether'));
    await USDT.approve(balancer.address, web3.utils.toWei('54', 'ether'));
    await balancer.bind(EURxb.address, web3.utils.toWei('46', 'ether'), web3.utils.toWei('23', 'ether'));
    await balancer.bind(USDT.address, web3.utils.toWei('54', 'ether'), web3.utils.toWei('27', 'ether'));
    await balancer.setSwapFee(web3.utils.toWei('1', 'finney'));
    await balancer.finalize();

    const timestamp = await currentTimestamp();
    staking = await StakingManager.new(gEURO.address, timestamp, 150);

    router = await Router.new(
      team, staking.address, timestamp,
      USDT.address, USDC.address, BUSD.address, DAI.address, EURxb.address,
    );

    await router.setBalancerPool(USDT.address, balancer.address);
    await staking.setBalancerPool(balancer.address);

    await increaseTime(DAY);
  });

  it('should return correct pool values', async () => {
    assert.equal(await balancer.getNumTokens(), 2);
    assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('46', 'ether'));
    assert.equal(await balancer.getBalance(USDT.address), web3.utils.toWei('54', 'ether'));
    assert.equal(await balancer.getSwapFee(), web3.utils.toWei('1', 'finney'));
  });

  it('should return correct balance EURxb values', async () => {
    await EURxb.transfer(router.address, web3.utils.toWei('400', 'ether'));
    await USDT.approve(router.address, web3.utils.toWei('54', 'ether'), { from: recipient });
    await router.exchange(USDT.address, web3.utils.toWei('54', 'ether'), { from: recipient });
    const balance = await EURxb.balanceOf(recipient);
    assert.equal(web3.utils.fromWei(balance, 'ether'), 46);
  });

  it('should return correct pool values when adding liquidity through a contract', async () => {
    await EURxb.transfer(router.address, web3.utils.toWei('400', 'ether'));
    await USDT.approve(router.address, web3.utils.toWei('200', 'ether'), { from: recipient });
    await router.addLiquidity(USDT.address, web3.utils.toWei('108', 'ether'), { from: recipient });

    assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('92', 'ether'));
    assert.equal(await balancer.getBalance(USDT.address), web3.utils.toWei('108', 'ether'));

    await USDT.approve(router.address, web3.utils.toWei('200', 'ether'), { from: staker });
    await router.addLiquidity(USDT.address, web3.utils.toWei('108', 'ether'), { from: staker });
    assert.equal(await balancer.getBalance(EURxb.address), web3.utils.toWei('138', 'ether'));
    assert.equal(await balancer.getBalance(USDT.address), web3.utils.toWei('162', 'ether'));
  });
});
