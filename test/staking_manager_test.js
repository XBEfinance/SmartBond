const { assert } = require('chai');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const MockToken = artifacts.require('MockToken');
const StakingManager = artifacts.require('StakingManager');

contract('StakingManager', (accounts) => {
  const recipient = accounts[1];
  const staker = accounts[2];
  const operator = accounts[3];

  let BPT;
  let gEURO;
  let staking;

  beforeEach(async () => {
    BPT = await MockToken.new('BPT', 'BPT', web3.utils.toWei('400', 'ether'));
    gEURO = await MockToken.new('gEURO', 'gEURO', web3.utils.toWei('10000', 'ether'));

    const timestamp = await currentTimestamp();
    staking = await StakingManager.new(BPT.address, gEURO.address, timestamp, 60);
    await gEURO.transfer(staking.address, web3.utils.toWei('10000', 'ether'));
  });

  it('should correct change operator', async () => {
    const oldOperator = await staking.operatorAddress();
    await staking.setOperatorAddress(operator);
    assert.equal(await staking.operatorAddress(), operator);
    assert.notEqual(await staking.operatorAddress(), oldOperator);
  });

  it('should return correct pool values when adding liquidity through a contract', async () => {
    await BPT.approve(staking.address, web3.utils.toWei('100', 'ether'));
    await staking.addStaker(recipient, web3.utils.toWei('100', 'ether'));
    assert.equal(await staking.getNumberBPTTokens(recipient), web3.utils.toWei('100', 'ether'));
  });

  it('should correct claim BPT tokens and unfreeze tokens', async () => {
    assert.equal(await staking.isFrozen(), true);

    await BPT.approve(staking.address, web3.utils.toWei('200', 'ether'));
    await staking.addStaker(recipient, web3.utils.toWei('100', 'ether'));
    await increaseTime(DAY * 8);
    await staking.addStaker(staker, web3.utils.toWei('100', 'ether'));

    assert.equal(await staking.getNumberBPTTokens(recipient), web3.utils.toWei('100', 'ether'));
    assert.equal(await staking.getNumberBPTTokens(staker), web3.utils.toWei('100', 'ether'));

    await staking.unfreezeTokens();
    assert.equal(await staking.isFrozen(), false);

    await staking.claimBPT({ from: recipient });
    await staking.claimBPT({ from: staker });
    assert.equal(await BPT.balanceOf(recipient), web3.utils.toWei('100', 'ether'));
    assert.equal(await BPT.balanceOf(staker), web3.utils.toWei('100', 'ether'));
    assert.equal(await gEURO.balanceOf(recipient), web3.utils.toWei('6000', 'ether'));
    assert.equal(await gEURO.balanceOf(staker), web3.utils.toWei('4000', 'ether'));
  });
});
