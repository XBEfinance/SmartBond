const { assert } = require('chai');
const { increaseTime, DAY } = require('./common');

const EURxb = artifacts.require('EURxb');

contract('EURxb', (accounts) => {
  const recipient = accounts[1];
  const bondToken = accounts[2];

  let token;

  beforeEach(async () => {
    token = await EURxb.new(bondToken);
  });

  it('should return correct balance values', async () => {
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    await increaseTime(DAY * 365);
    const balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('106999999999999999000', 'wei'));
    assert(balance < web3.utils.toWei('107000000000000002000', 'wei'));
  });

  it('should return correct balance approximation values', async () => {
    await token.mint(recipient, web3.utils.toWei('100', 'ether'));
    let year = 365;
    while (year > 0) {
      /* eslint-disable */
      await increaseTime(DAY);
      await token.accrueInterest();
      year--;
      /* eslint-enable */
    }
    const balance = await token.balanceOf(recipient);
    assert(balance > web3.utils.toWei('107200000000000000000', 'wei'));
    assert(balance < web3.utils.toWei('107290000000000000000', 'wei'));
  });
});
