const { assert } = require('chai');
const { increaseTime, currentTimestamp, DAY } = require('./common');

const MockToken = artifacts.require('MockToken');
const StakingManager = artifacts.require('StakingManager');

contract('StakingManager', (accounts) => {
  const recipient = accounts[1];
  const operator = accounts[2];

  let BPT;
  let gEURO;
  let staking;

  beforeEach(async () => {
    BPT = await MockToken.new('BPT', 'BPT', web3.utils.toWei('400', 'ether'));
    gEURO = await MockToken.new('gEURO', 'gEURO', web3.utils.toWei('10000', 'ether'));

    const timestamp = await currentTimestamp();
    staking = await StakingManager.new(BPT.address, gEURO.address, timestamp, 60);
    await BPT.transfer(recipient, web3.utils.toWei('200', 'ether'));
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

  it('should correct unfreeze tokens', async () => {
    assert.equal(await staking.isFrozen(), true);
    await increaseTime(DAY * 8);
    await staking.unfreezeTokens();
    assert.equal(await staking.isFrozen(), false);
  });

  it('should correct claim BPT tokens', async () => {
    await BPT.approve(staking.address, web3.utils.toWei('100', 'ether'));
    await staking.addStaker(recipient, web3.utils.toWei('100', 'ether'));

    await increaseTime(DAY * 8);
    await staking.unfreezeTokens();

    await staking.claimBPT({ from: recipient });
    assert.equal(await BPT.balanceOf(recipient), web3.utils.toWei('100', 'ether'));
  });
});
