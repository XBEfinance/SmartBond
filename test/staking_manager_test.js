const { assert } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const MockToken = artifacts.require('MockToken');
const StakingManager = artifacts.require('StakingManager');

contract('StakingManager', (accounts) => {
  const recipient = accounts[1];
  const staker = accounts[2];

  let BPT;
  let xbg;
  let staking;

  let timestamp;

  beforeEach(async () => {
    BPT = await MockToken.new('BPT', 'BPT', web3.utils.toWei('400', 'ether'));
    xbg = await MockToken.new('xbg', 'xbg', web3.utils.toWei('10000', 'ether'));

    timestamp = await currentTimestamp();
    staking = await StakingManager.new(xbg.address, timestamp, 150);
    await increaseTime(DAY / 2);
  });

  it('should throw an exception when the constructor is called', async () => {
    await expectRevert(StakingManager.new(xbg.address, timestamp, 50), 'Weight must be over 100');
  });

  it('should return correct staking values', async () => {
    assert.equal(await staking.isFrozen(), true);
    assert.equal(await staking.startTime(), timestamp);
    assert.equal(await staking.bonusWeight(), 150);
  });

  it('should return correct pool values when adding liquidity through a contract', async () => {
    await staking.setBalancerPool(BPT.address);
    await BPT.approve(staking.address, web3.utils.toWei('100', 'ether'));
    await staking.addStaker(recipient, BPT.address, web3.utils.toWei('100', 'ether'));
    const result = await staking.getRewardInfo(recipient, BPT.address);
    assert.equal(result.bptBalance, web3.utils.toWei('100', 'ether'));
  });

  it('should throw an exception when the unfreezeTokens is called', async () => {
    await expectRevert(staking.unfreezeTokens(), 'Time is not over');
  });

  it('should correct claim BPT tokens and unfreeze tokens', async () => {
    assert.equal(await staking.isFrozen(), true);

    await staking.setBalancerPool(BPT.address);
    await BPT.approve(staking.address, web3.utils.toWei('200', 'ether'));
    await staking.addStaker(recipient, BPT.address, web3.utils.toWei('100', 'ether'));
    await increaseTime(DAY * 4);
    await staking.addStaker(staker, BPT.address, web3.utils.toWei('100', 'ether'));

    let resultRecipient = await staking.getRewardInfo(recipient, BPT.address);
    let resultStaker = await staking.getRewardInfo(staker, BPT.address);
    assert.equal(resultRecipient.bptBalance, web3.utils.toWei('100', 'ether'));
    assert.equal(resultStaker.bptBalance, web3.utils.toWei('100', 'ether'));
    assert.equal(resultRecipient.xbgBalance, web3.utils.toWei('0', 'ether'));
    assert.equal(resultStaker.xbgBalance, web3.utils.toWei('0', 'ether'));

    await increaseTime(DAY * 2);

    await expectRevert(staking.unfreezeTokens(), 'Insufficient xbg balance');

    await xbg.transfer(staking.address, web3.utils.toWei('10000', 'ether'));
    await staking.unfreezeTokens();
    assert.equal(await staking.isFrozen(), false);

    resultRecipient = await staking.getRewardInfo(recipient, BPT.address);
    resultStaker = await staking.getRewardInfo(staker, BPT.address);
    assert.equal(resultRecipient.xbgBalance, web3.utils.toWei('1200', 'ether'));
    assert.equal(resultStaker.xbgBalance, web3.utils.toWei('800', 'ether'));

    await staking.claimBPT(BPT.address, { from: recipient });
    await staking.claimBPT(BPT.address, { from: staker });
    assert.equal(await BPT.balanceOf(recipient), web3.utils.toWei('100', 'ether'));
    assert.equal(await BPT.balanceOf(staker), web3.utils.toWei('100', 'ether'));
    assert.equal(await xbg.balanceOf(recipient), web3.utils.toWei('1200', 'ether'));
    assert.equal(await xbg.balanceOf(staker), web3.utils.toWei('800', 'ether'));
  });

  it('should throw an exception when the unfreezeTokens is called', async () => {
    await xbg.transfer(staking.address, web3.utils.toWei('10000', 'ether'));
    await staking.unfreezeTokens();
    await expectRevert(staking.unfreezeTokens(), 'Tokens unfrozen');
  });

  it('should throw an exception when the addStaker is called', async () => {
    await expectRevert(staking.addStaker(staker, BPT.address, web3.utils.toWei('100', 'ether')), 'Balancer pool not found');
  });

  it('should throw an exception when the claimBPT is called', async () => {
    await expectRevert(staking.claimBPT(BPT.address, { from: recipient }), 'Tokens frozen');
    await xbg.transfer(staking.address, web3.utils.toWei('10000', 'ether'));
    await staking.unfreezeTokens();
    await expectRevert(staking.claimBPT(BPT.address, { from: recipient }), "Staker doesn't exist");
  });
});
