const { assert } = require('chai');

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
    gEURO = await MockToken.new('gEURO', 'gEURO', web3.utils.toWei('400', 'ether'));

    staking = await StakingManager.new(BPT.address, gEURO.address, 1604993292, 60);
    await BPT.transfer(recipient, web3.utils.toWei('200', 'ether'));
    await gEURO.transfer(staking.address, web3.utils.toWei('200', 'ether'));
  });

  it('should return correct change operator', async () => {
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
});
