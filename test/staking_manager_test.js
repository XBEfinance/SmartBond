const { assert } = require('chai');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const MockToken = artifacts.require('MockToken');
const StakingManager = artifacts.require('StakingManager');

contract('StakingManager', (accounts) => {
  const recipient = accounts[1];
  const staker = accounts[2];

  let BPT;
  let gEURO;
  let staking;

  let timestamp;

  beforeEach(async () => {
    BPT = await MockToken.new('BPT', 'BPT', web3.utils.toWei('400', 'ether'));
    gEURO = await MockToken.new('gEURO', 'gEURO', web3.utils.toWei('10000', 'ether'));

    timestamp = await currentTimestamp();
    staking = await StakingManager.new(gEURO.address, timestamp, 150);
    await staking.setBalancerPool(BPT.address);
    await gEURO.transfer(staking.address, web3.utils.toWei('10000', 'ether'));
    await increaseTime(DAY / 2);
  });

  it('should return correct staking values', async () => {
    assert.equal(await staking.isFrozen(), true);
    assert.equal(await staking.startTime(), timestamp);
    assert.equal(await staking.bonusWeight(), 150);
  });

  it('should return correct pool values when adding liquidity through a contract', async () => {
    await BPT.approve(staking.address, web3.utils.toWei('100', 'ether'));
    await staking.addStaker(recipient, BPT.address, web3.utils.toWei('100', 'ether'));
    const result = await staking.getRewardInfo(recipient, BPT.address);
    assert.equal(result.bptBalance, web3.utils.toWei('100', 'ether'));
  });

  it('should correct claim BPT tokens and unfreeze tokens', async () => {
    assert.equal(await staking.isFrozen(), true);

    await BPT.approve(staking.address, web3.utils.toWei('200', 'ether'));
    await staking.addStaker(recipient, BPT.address, web3.utils.toWei('100', 'ether'));
    await increaseTime(DAY * 4);
    await staking.addStaker(staker, BPT.address, web3.utils.toWei('100', 'ether'));

    let resultRecipient = await staking.getRewardInfo(recipient, BPT.address);
    let resultStaker = await staking.getRewardInfo(staker, BPT.address);
    assert.equal(resultRecipient.bptBalance, web3.utils.toWei('100', 'ether'));
    assert.equal(resultStaker.bptBalance, web3.utils.toWei('100', 'ether'));
    assert.equal(resultRecipient.gEuroBalance, web3.utils.toWei('0', 'ether'));
    assert.equal(resultStaker.gEuroBalance, web3.utils.toWei('0', 'ether'));

    await increaseTime(DAY * 2);
    await staking.unfreezeTokens();
    assert.equal(await staking.isFrozen(), false);
    resultRecipient = await staking.getRewardInfo(recipient, BPT.address);
    resultStaker = await staking.getRewardInfo(staker, BPT.address);
    assert.equal(resultRecipient.gEuroBalance, web3.utils.toWei('1500', 'ether'));
    assert.equal(resultStaker.gEuroBalance, web3.utils.toWei('1000', 'ether'));

    await staking.claimBPT(BPT.address, { from: recipient });
    await staking.claimBPT(BPT.address, { from: staker });
    assert.equal(await BPT.balanceOf(recipient), web3.utils.toWei('100', 'ether'));
    assert.equal(await BPT.balanceOf(staker), web3.utils.toWei('100', 'ether'));
    assert.equal(await gEURO.balanceOf(recipient), web3.utils.toWei('1500', 'ether'));
    assert.equal(await gEURO.balanceOf(staker), web3.utils.toWei('1000', 'ether'));
  });
});
